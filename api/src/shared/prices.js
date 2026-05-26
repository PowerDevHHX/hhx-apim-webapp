// Model pricing table. USD per 1,000,000 tokens.
//
// Update these values when provider pricing changes or when new models appear.
// Matching is done by exact model name first, then by prefix.
//
// ⚠️ Values below are reasonable defaults; verify against your Foundry/provider
//    billing before treating these numbers as authoritative.
//
// Anthropic note: cache reads/writes are NOT modeled here. Only input+output.

const PRICING = [
  // ─── Anthropic ────────────────────────────────────────────────────
  { match: 'claude-sonnet-4-6',     inputPerMTok: 3.00,  outputPerMTok: 15.00 },
  { match: 'claude-sonnet-4',       inputPerMTok: 3.00,  outputPerMTok: 15.00 },
  { match: 'claude-opus-4',         inputPerMTok: 15.00, outputPerMTok: 75.00 },
  { match: 'claude-haiku-4',        inputPerMTok: 1.00,  outputPerMTok: 5.00 },
  { match: 'claude-3-7-sonnet',     inputPerMTok: 3.00,  outputPerMTok: 15.00 },
  { match: 'claude-3-5-sonnet',     inputPerMTok: 3.00,  outputPerMTok: 15.00 },
  { match: 'claude-3-5-haiku',      inputPerMTok: 0.80,  outputPerMTok: 4.00 },
  { match: 'claude-',               inputPerMTok: 3.00,  outputPerMTok: 15.00 }, // fallback prefix

  // ─── OpenAI ───────────────────────────────────────────────────────
  { match: 'gpt-4.1-2025-04-14',    inputPerMTok: 2.00,  outputPerMTok: 8.00 },
  { match: 'gpt-4.1-mini',          inputPerMTok: 0.40,  outputPerMTok: 1.60 },
  { match: 'gpt-4.1-nano',          inputPerMTok: 0.10,  outputPerMTok: 0.40 },
  { match: 'gpt-4.1',               inputPerMTok: 2.00,  outputPerMTok: 8.00 },
  { match: 'gpt-4o-mini',           inputPerMTok: 0.15,  outputPerMTok: 0.60 },
  { match: 'gpt-4o',                inputPerMTok: 2.50,  outputPerMTok: 10.00 },
  { match: 'gpt-5',                 inputPerMTok: 1.25,  outputPerMTok: 10.00 },
  { match: 'gpt-',                  inputPerMTok: 2.00,  outputPerMTok: 8.00 }, // fallback prefix
];

const DEFAULT_RATE = { inputPerMTok: 0, outputPerMTok: 0 };

function lookupRate(model) {
  if (!model) return DEFAULT_RATE;
  const m = String(model).toLowerCase();
  // exact match wins
  const exact = PRICING.find((p) => p.match.toLowerCase() === m);
  if (exact) return exact;
  // then prefix
  const prefix = PRICING.find((p) => m.startsWith(p.match.toLowerCase()));
  if (prefix) return prefix;
  return DEFAULT_RATE;
}

/**
 * @param {string} model
 * @param {number} promptTokens
 * @param {number} completionTokens
 * @returns {number} USD cost
 */
function estimateCost(model, promptTokens, completionTokens) {
  const r = lookupRate(model);
  const p = Number(promptTokens) || 0;
  const c = Number(completionTokens) || 0;
  return (p / 1_000_000) * r.inputPerMTok + (c / 1_000_000) * r.outputPerMTok;
}

module.exports = { estimateCost, lookupRate };
