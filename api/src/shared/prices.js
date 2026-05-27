// Model pricing table. USD per 1,000,000 tokens.
//
// Update these values when provider pricing changes or when new models appear.
// Matching is done by exact model name first, then by prefix.
//
// ⚠️ Values below are reasonable defaults; verify against your Foundry/provider
//    billing before treating these numbers as authoritative.
//
// Cache-aware note:
// - Anthropic bills fresh input, cache reads, cache writes, and output separately.
// - OpenAI bills fresh input + cached input + output, with cached input discounted.

const PRICING = [
  // ─── Anthropic ────────────────────────────────────────────────────
  { match: 'claude-sonnet-4-6', inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },
  { match: 'claude-sonnet-4',   inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },
  { match: 'claude-opus-4-7',   inputPerMTok: 15.00, cacheReadPerMTok: 1.50, cacheWritePerMTok: 18.75, outputPerMTok: 75.00 },
  { match: 'claude-opus-4',     inputPerMTok: 15.00, cacheReadPerMTok: 1.50, cacheWritePerMTok: 18.75, outputPerMTok: 75.00 },
  { match: 'claude-haiku-4',    inputPerMTok: 1.00, cacheReadPerMTok: 0.10, cacheWritePerMTok: 1.25, outputPerMTok: 5.00 },
  { match: 'claude-3-7-sonnet', inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },
  { match: 'claude-3-5-sonnet', inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 },
  { match: 'claude-3-5-haiku',  inputPerMTok: 0.80, cacheReadPerMTok: 0.08, cacheWritePerMTok: 1.00, outputPerMTok: 4.00 },
  { match: 'claude-',           inputPerMTok: 3.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75, outputPerMTok: 15.00 }, // fallback prefix

  // ─── OpenAI ───────────────────────────────────────────────────────
  { match: 'gpt-4.1-2025-04-14', inputPerMTok: 2.00, cachedInputPerMTok: 0.50, outputPerMTok: 8.00 },
  { match: 'gpt-4.1-mini',       inputPerMTok: 0.40, cachedInputPerMTok: 0.10, outputPerMTok: 1.60 },
  { match: 'gpt-4.1-nano',       inputPerMTok: 0.10, cachedInputPerMTok: 0.025, outputPerMTok: 0.40 },
  { match: 'gpt-4.1',            inputPerMTok: 2.00, cachedInputPerMTok: 0.50, outputPerMTok: 8.00 },
  { match: 'gpt-4o-mini',        inputPerMTok: 0.15, cachedInputPerMTok: 0.075, outputPerMTok: 0.60 },
  { match: 'gpt-4o',             inputPerMTok: 2.50, cachedInputPerMTok: 1.25, outputPerMTok: 10.00 },
  { match: 'gpt-5',              inputPerMTok: 1.25, cachedInputPerMTok: 0.125, outputPerMTok: 10.00 },
  { match: 'gpt-',               inputPerMTok: 2.00, cachedInputPerMTok: 0.50, outputPerMTok: 8.00 }, // fallback prefix
];

const DEFAULT_RATE = {
  inputPerMTok: 0,
  cachedInputPerMTok: 0,
  cacheReadPerMTok: 0,
  cacheWritePerMTok: 0,
  outputPerMTok: 0,
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

  if (provider === 'anthropic') {
    return (
      (freshPrompt / 1_000_000) * rates.inputPerMTok +
      (cachedPrompt / 1_000_000) * rates.cacheReadPerMTok +
      (cacheCreation / 1_000_000) * rates.cacheWritePerMTok +
      (output / 1_000_000) * rates.outputPerMTok
    );
  }

  return (
    (freshPrompt / 1_000_000) * rates.inputPerMTok +
    (cachedPrompt / 1_000_000) * rates.cachedInputPerMTok +
    (output / 1_000_000) * rates.outputPerMTok
  );
}

module.exports = { estimateCost, lookupRate };
