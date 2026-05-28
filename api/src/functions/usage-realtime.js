const { app } = require('@azure/functions');
const { REALTIME } = require('../shared/queries');
const { estimateCost } = require('../shared/prices');
const { runQueryHandler } = require('../shared/handlerHelpers');

// 5-minute window, already grouped by developer/provider/model in KQL.
// Same cache-aware cost math as daily/monthly endpoints.
function enrichRealtimeRow(r) {
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
    error_rate: Number(r.error_rate) || 0,
  };
}

app.http('usage-realtime', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/realtime',
  handler: async (req, context) =>
    runQueryHandler({ query: REALTIME, transform: enrichRealtimeRow }, req, context),
});
