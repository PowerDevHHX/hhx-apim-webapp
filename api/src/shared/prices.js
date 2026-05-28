// Model pricing table. USD per 1,000,000 tokens.
//
// Matching is done by exact model name first, then by prefix.
//
// ⚠️ PROVISIONAL:
// - These entries are being updated against currently published provider/model docs,
//   but some Foundry catalog pages don't expose machine-readable token rates cleanly.
// - Keep these markers until we've reconciled against the actual Azure bill and/or
//   pricing calculator for the deployed tenant/region.
// - Do not present these as fully authoritative yet.
//
// Cache-aware note:
// - Anthropic bills fresh input, cache reads, cache writes, and output separately.
// - OpenAI bills fresh input + cached input + output, with cached input discounted.
// - Anthropic cache write = newly created cacheable prompt segment being stored.
// - Anthropic cache read/hit = later reuse of already cached prompt tokens.

const PRICING = [
  // ─── Anthropic (provisional, aligned to published Claude pricing table) ────────
  { match: 'claude-haiku-4-5',  provider: 'anthropic', provisional: true, source: 'anthropic-claude-pricing', inputPerMTok: 1.00, cacheReadPerMTok: 0.10, cacheWritePerMTok: 1.25, outputPerMTok: 5.00 },
  { match: 'claude-haiku-4',    provider: 'anthropic', provisional: true, source: 'anthropic-claude-pricing', inputPerMTok: 1.00, cacheReadPerMTok: 0.10, cacheWritePerMTok: 1.25, outputPerMTok: 5.00 },
  { match: 'claude-sonnet-4-6', provider: 'anthropic', provisional: true, source: 'anthropic-claude-pricing', inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },
  { match: 'claude-sonnet-4',   provider: 'anthropic', provisional: true, source: 'anthropic-claude-pricing', inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },
  { match: 'claude-opus-4-7',   provider: 'anthropic', provisional: true, source: 'anthropic-claude-pricing', inputPerMTok: 5.00, cacheReadPerMTok: 0.50, cacheWritePerMTok: 6.25, outputPerMTok: 25.00 },
  { match: 'claude-opus-4-6',   provider: 'anthropic', provisional: true, source: 'anthropic-claude-pricing', inputPerMTok: 5.00, cacheReadPerMTok: 0.50, cacheWritePerMTok: 6.25, outputPerMTok: 25.00 },
  { match: 'claude-opus-4-5',   provider: 'anthropic', provisional: true, source: 'anthropic-claude-pricing', inputPerMTok: 5.00, cacheReadPerMTok: 0.50, cacheWritePerMTok: 6.25, outputPerMTok: 25.00 },
  { match: 'claude-opus-4',     provider: 'anthropic', provisional: true, source: 'anthropic-claude-pricing', inputPerMTok: 15.00, cacheReadPerMTok: 1.50, cacheWritePerMTok: 18.75, outputPerMTok: 75.00 },
  { match: 'claude-3-7-sonnet', provider: 'anthropic', provisional: true, source: 'anthropic-legacy-pricing', inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },
  { match: 'claude-3-5-sonnet', provider: 'anthropic', provisional: true, source: 'anthropic-legacy-pricing', inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },
  { match: 'claude-3-5-haiku',  provider: 'anthropic', provisional: true, source: 'anthropic-legacy-pricing', inputPerMTok: 0.80, cacheReadPerMTok: 0.08, cacheWritePerMTok: 1.00, outputPerMTok: 4.00 },
  { match: 'claude-',           provider: 'anthropic', provisional: true, source: 'anthropic-fallback', inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },

  // ─── OpenAI / Azure OpenAI / Foundry (provisional) ────────────────────────────
  { match: 'gpt-4.1-2025-04-14', provider: 'openai', provisional: true, source: 'openai-pricing', inputPerMTok: 2.00, cachedInputPerMTok: 0.50, outputPerMTok: 8.00 },
  { match: 'gpt-4.1',            provider: 'openai', provisional: true, source: 'openai-pricing', inputPerMTok: 2.00, cachedInputPerMTok: 0.50, outputPerMTok: 8.00 },
  { match: 'gpt-4o-mini',        provider: 'openai', provisional: true, source: 'openai-pricing', inputPerMTok: 0.15, cachedInputPerMTok: 0.075, outputPerMTok: 0.60 },
  { match: 'gpt-4o',             provider: 'openai', provisional: true, source: 'openai-pricing', inputPerMTok: 2.50, cachedInputPerMTok: 1.25, outputPerMTok: 10.00 },
  { match: 'gpt-5.4-2026-03-05', provider: 'openai', provisional: true, source: 'openai-gpt-5.4-docs', inputPerMTok: 2.50, cachedInputPerMTok: 0.25, outputPerMTok: 15.00, longContextThresholdTokens: 270000, longContextInputMultiplier: 2.0, longContextOutputMultiplier: 1.5, longContextAppliesToFullSession: true },
  { match: 'gpt-5.4',            provider: 'openai', provisional: true, source: 'openai-gpt-5.4-docs', inputPerMTok: 2.50, cachedInputPerMTok: 0.25, outputPerMTok: 15.00, longContextThresholdTokens: 270000, longContextInputMultiplier: 2.0, longContextOutputMultiplier: 1.5, longContextAppliesToFullSession: true },
  { match: 'gpt-5',              provider: 'openai', provisional: true, source: 'openai-fallback', inputPerMTok: 1.25, cachedInputPerMTok: 0.125, outputPerMTok: 10.00 },
  { match: 'gpt-realtime-1.5',   provider: 'openai', provisional: true, source: 'openai-realtime-provisional', inputPerMTok: 4.00, cachedInputPerMTok: 0.40, outputPerMTok: 16.00 },
  { match: 'gpt-',               provider: 'openai', provisional: true, source: 'openai-fallback', inputPerMTok: 2.00, cachedInputPerMTok: 0.50, outputPerMTok: 8.00 },

  // ─── Other Foundry models (provisional placeholders from public catalog aggregators,
  //       pending direct Azure calculator / bill reconciliation) ──────────────────
  { match: 'fw-glm-5',           provider: 'fireworks', provisional: true, source: 'foundry-placeholder', inputPerMTok: 1.00, cachedInputPerMTok: 0, outputPerMTok: 4.00 },
  { match: 'glm-5',              provider: 'fireworks', provisional: true, source: 'foundry-placeholder', inputPerMTok: 1.00, cachedInputPerMTok: 0, outputPerMTok: 4.00 },
  { match: 'kimi-k2.5',          provider: 'kimi', provisional: true, source: 'azure-foundry-placeholder', inputPerMTok: 0.60, cachedInputPerMTok: 0, outputPerMTok: 3.00 },
  { match: 'kimi-k2',            provider: 'kimi', provisional: true, source: 'azure-foundry-placeholder', inputPerMTok: 0.60, cachedInputPerMTok: 0, outputPerMTok: 3.00 },
];

const DEFAULT_RATE = {
  inputPerMTok: 0,
  cachedInputPerMTok: 0,
  cacheReadPerMTok: 0,
  cacheWritePerMTok: 0,
  outputPerMTok: 0,
  longContextThresholdTokens: 0,
  longContextInputMultiplier: 1,
  longContextOutputMultiplier: 1,
  longContextAppliesToFullSession: false,
  provisional: true,
};

function lookupRate(model) {
  if (!model) return DEFAULT_RATE;
  const m = String(model).toLowerCase();
  const exact = PRICING.find((p) => p.match.toLowerCase() === m);
  if (exact) return { ...DEFAULT_RATE, ...exact };
  const prefix = PRICING.find((p) => m.startsWith(p.match.toLowerCase()));
  if (prefix) return { ...DEFAULT_RATE, ...prefix };
  return DEFAULT_RATE;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Estimate request or aggregate cost using provider-specific cache-aware math.
 *
 * Supported call styles:
 *   estimateCost(model, promptTokens, completionTokens)
 *   estimateCost({ provider, model, promptTokens, completionTokens, cachedPromptTokens, cacheCreationTokens, freshPromptTokens })
 */
function estimateCost(modelOrUsage, promptTokens, completionTokens) {
  const usage = typeof modelOrUsage === 'object' && modelOrUsage !== null
    ? modelOrUsage
    : {
        model: modelOrUsage,
        promptTokens,
        completionTokens,
      };

  const provider = String(usage.provider || '').toLowerCase();
  const model = usage.model;
  const rates = lookupRate(model);

  const totalPrompt = toNumber(usage.promptTokens);
  const output = toNumber(usage.completionTokens);
  const cachedPrompt = Math.max(0, toNumber(usage.cachedPromptTokens));
  const cacheCreation = Math.max(0, toNumber(usage.cacheCreationTokens));

  let freshPrompt = Math.max(0, toNumber(usage.freshPromptTokens));

  if (!freshPrompt) {
    if (provider === 'anthropic') {
      freshPrompt = Math.max(0, totalPrompt - cachedPrompt - cacheCreation);
    } else {
      freshPrompt = Math.max(0, totalPrompt - cachedPrompt);
    }
  }

  const longContextTriggered =
    rates.longContextThresholdTokens > 0 &&
    totalPrompt > rates.longContextThresholdTokens;

  const inputMultiplier = longContextTriggered ? rates.longContextInputMultiplier : 1;
  const outputMultiplier = longContextTriggered ? rates.longContextOutputMultiplier : 1;

  if (provider === 'anthropic') {
    return (
      (freshPrompt / 1_000_000) * rates.inputPerMTok +
      (cachedPrompt / 1_000_000) * rates.cacheReadPerMTok +
      (cacheCreation / 1_000_000) * rates.cacheWritePerMTok +
      (output / 1_000_000) * rates.outputPerMTok
    );
  }

  return (
    (freshPrompt / 1_000_000) * rates.inputPerMTok * inputMultiplier +
    (cachedPrompt / 1_000_000) * rates.cachedInputPerMTok * inputMultiplier +
    (output / 1_000_000) * rates.outputPerMTok * outputMultiplier
  );
}

module.exports = { estimateCost, lookupRate };
