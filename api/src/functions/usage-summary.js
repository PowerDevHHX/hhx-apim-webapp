const { app } = require('@azure/functions');
const { usageSummaryQuery } = require('../shared/queries');
const { estimateCost } = require('../shared/prices');
const { runQueryHandler } = require('../shared/handlerHelpers');

function enrichRow(r) {
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

app.http('usage-summary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/summary',
  handler: async (req, context) => {
    const window = req.query.get('window') || '1d';
    return runQueryHandler(
      {
        query: usageSummaryQuery(window),
        transform: enrichRow,
        finalize: (rows) => {
          const totals = rows.reduce(
            (acc, row) => {
              acc.calls += Number(row.calls) || 0;
              acc.success_calls += Number(row.success_calls) || 0;
              acc.failed_calls += Number(row.failed_calls) || 0;
              acc.rate_limited_calls += Number(row.rate_limited_calls) || 0;
              acc.active_users = Math.max(acc.active_users, Number(row.active_users) || 0);
              acc.active_models = Math.max(acc.active_models, Number(row.active_models) || 0);
              acc.input_tokens += Number(row.input_tokens) || 0;
              acc.output_tokens += Number(row.output_tokens) || 0;
              acc.total_tokens += Number(row.total_tokens) || 0;
              acc.fresh_prompt_tokens += Number(row.fresh_prompt_tokens) || 0;
              acc.cached_prompt_tokens += Number(row.cached_prompt_tokens) || 0;
              acc.cache_creation_tokens += Number(row.cache_creation_tokens) || 0;
              acc.est_cost_usd += Number(row.est_cost_usd) || 0;
              return acc;
            },
            {
              calls: 0,
              success_calls: 0,
              failed_calls: 0,
              rate_limited_calls: 0,
              active_users: 0,
              active_models: 0,
              input_tokens: 0,
              output_tokens: 0,
              total_tokens: 0,
              fresh_prompt_tokens: 0,
              cached_prompt_tokens: 0,
              cache_creation_tokens: 0,
              est_cost_usd: 0,
            }
          );

          return {
            window,
            totals: {
              ...totals,
              cache_hit_ratio: totals.input_tokens > 0 ? totals.cached_prompt_tokens / totals.input_tokens : 0,
            },
            by_provider: rows,
          };
        },
      },
      context
    );
  },
});
