const { app } = require('@azure/functions');
const { MONTHLY } = require('../shared/queries');
const { estimateCost } = require('../shared/prices');
const { runQueryHandler } = require('../shared/handlerHelpers');

function enrichUsageRow(r) {
  const input = Number(r.input_tokens) || 0;
  const cached = Number(r.cached_prompt_tokens) || 0;
  const cacheCreation = Number(r.cache_creation_tokens) || 0;
  const fresh = Number(r.fresh_prompt_tokens) || Math.max(0, input - cached - cacheCreation);
  const estCost = estimateCost({
    provider: r.provider,
    model: r.model,
    promptTokens: input,
    completionTokens: Number(r.output_tokens) || 0,
    freshPromptTokens: fresh,
    cachedPromptTokens: cached,
    cacheCreationTokens: cacheCreation,
  });

  return {
    ...r,
    est_cost_usd: estCost,
    cache_hit_ratio: input > 0 ? cached / input : 0,
  };
}

app.http('usage-monthly', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/monthly',
  handler: async (_req, context) =>
    runQueryHandler(
      {
        query: MONTHLY,
        transform: enrichUsageRow,
      },
      context
    ),
});
