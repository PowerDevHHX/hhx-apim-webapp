const { app } = require('@azure/functions');
const { LIVE_FEED } = require('../shared/queries');
const { estimateCost } = require('../shared/prices');
const { runQueryHandler } = require('../shared/handlerHelpers');

// Per-request enrichment.
// Telemetry from APIM policies (see C:\projects\APIMPOLICIES) emits:
//   - promptTokens, completionTokens, totalTokens
//   - freshPromptTokens, cachedPromptTokens, cacheCreationTokens
//   - provider, model
// OpenAI policy always sets cacheCreationTokens=0 (no cache-write concept).
// Anthropic policy sets all three cache fields from the response usage block.
function enrichLiveRow(r) {
  const input = Number(r.prompt_tokens) || 0;
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
    error_rate: Number(r.error_rate) || 0,
  };
}

app.http('usage-live-feed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/live-feed',
  handler: async (req, context) =>
    runQueryHandler({ query: LIVE_FEED, transform: enrichLiveRow }, req, context),
});
