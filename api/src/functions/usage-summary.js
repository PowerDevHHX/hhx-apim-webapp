const { app } = require('@azure/functions');
const { usageRowsByWindowQuery, usageSummaryQuery } = require('../shared/queries');
const { estimateCost } = require('../shared/prices');
const { runQueryHandler, runQuery } = require('../shared/handlerHelpers');

/**
 * Enrich a per-model row with estimated cost.
 * The per-model rows have both `provider` and `model`, so lookupRate works.
 */
function enrichModelRow(r) {
  const input = Number(r.input_tokens) || 0;
  const cached = Number(r.cached_prompt_tokens) || 0;
  const cacheCreation = Number(r.cache_creation_tokens) || 0;
  const fresh = Number(r.fresh_prompt_tokens) || Math.max(0, input - cached - cacheCreation);

  return {
    ...r,
    est_cost_usd: estimateCost({
      provider: r.provider,
      model: r.model,
      promptTokens: input,
      completionTokens: Number(r.output_tokens) || 0,
      freshPromptTokens: fresh,
      cachedPromptTokens: cached,
      cacheCreationTokens: cacheCreation,
    }),
    cache_hit_ratio: input > 0 ? cached / input : 0,
  };
}

/**
 * Roll per-model rows up into per-provider summaries with correct cost,
 * then produce grand totals.
 */
function buildSummary(modelRows, window) {
  // Aggregate per-provider
  const byProvider = {};
  for (const r of modelRows) {
    const key = r.provider || 'unknown';
    if (!byProvider[key]) {
      byProvider[key] = {
        provider: key,
        calls: 0,
        success_calls: 0,
        failed_calls: 0,
        rate_limited_calls: 0,
        active_users: new Set(),
        active_models: new Set(),
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        fresh_prompt_tokens: 0,
        cached_prompt_tokens: 0,
        cache_creation_tokens: 0,
        est_cost_usd: 0,
      };
    }
    const p = byProvider[key];
    p.calls += Number(r.calls) || 0;
    p.success_calls += Number(r.success_calls) || 0;
    p.failed_calls += Number(r.failed_calls) || 0;
    p.rate_limited_calls += Number(r.rate_limited_calls) || 0;
    if (r.developer) p.active_users.add(r.developer);
    if (r.model) p.active_models.add(r.model);
    p.input_tokens += Number(r.input_tokens) || 0;
    p.output_tokens += Number(r.output_tokens) || 0;
    p.total_tokens += Number(r.total_tokens) || 0;
    p.fresh_prompt_tokens += Number(r.fresh_prompt_tokens) || 0;
    p.cached_prompt_tokens += Number(r.cached_prompt_tokens) || 0;
    p.cache_creation_tokens += Number(r.cache_creation_tokens) || 0;
    p.est_cost_usd += Number(r.est_cost_usd) || 0;
  }

  // Flatten Sets to counts
  const providerRows = Object.values(byProvider).map((p) => ({
    ...p,
    active_users: p.active_users.size,
    active_models: p.active_models.size,
    cache_hit_ratio: p.input_tokens > 0 ? p.cached_prompt_tokens / p.input_tokens : 0,
  }));
  providerRows.sort((a, b) => b.total_tokens - a.total_tokens);

  // Grand totals
  const allUsers = new Set();
  const allModels = new Set();
  for (const r of modelRows) {
    if (r.developer) allUsers.add(r.developer);
    if (r.model) allModels.add(r.model);
  }

  const totals = providerRows.reduce(
    (acc, row) => {
      acc.calls += row.calls;
      acc.success_calls += row.success_calls;
      acc.failed_calls += row.failed_calls;
      acc.rate_limited_calls += row.rate_limited_calls;
      acc.input_tokens += row.input_tokens;
      acc.output_tokens += row.output_tokens;
      acc.total_tokens += row.total_tokens;
      acc.fresh_prompt_tokens += row.fresh_prompt_tokens;
      acc.cached_prompt_tokens += row.cached_prompt_tokens;
      acc.cache_creation_tokens += row.cache_creation_tokens;
      acc.est_cost_usd += row.est_cost_usd;
      return acc;
    },
    {
      calls: 0,
      success_calls: 0,
      failed_calls: 0,
      rate_limited_calls: 0,
      active_users: allUsers.size,
      active_models: allModels.size,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      fresh_prompt_tokens: 0,
      cached_prompt_tokens: 0,
      cache_creation_tokens: 0,
      est_cost_usd: 0,
    }
  );
  totals.cache_hit_ratio = totals.input_tokens > 0 ? totals.cached_prompt_tokens / totals.input_tokens : 0;

  return { window, totals, by_provider: providerRows };
}

app.http('usage-summary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/summary',
  handler: async (req, context) => {
    const window = req.query.get('window') || '1d';
    // Use the per-model-row query so we can compute cost accurately per model,
    // then aggregate up into per-provider summaries + grand totals.
    return runQueryHandler(
      {
        query: usageRowsByWindowQuery(window),
        transform: enrichModelRow,
        finalize: (rows) => buildSummary(rows, window),
      },
      req,
      context
    );
  },
});
