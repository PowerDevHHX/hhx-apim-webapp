# Pricing Research - 2026-05-28

Goal: establish the best current pricing matrix for the Foundry model list used by HHX Gateway, then map it into both OpenClaw model config and the dashboard cost estimator.

## Requested model list

- Claude-haiku-4-5
- Claude-opus-4-6
- Claude-opus-4-7
- Claude-sonnet-4-6
- FW-GLM-5
- gpt-4.1
- gpt-4o
- gpt-5.4
- gpt-realtime-1.5
- Kimi-k2.5

---

## Pricing status summary

### Officially grounded from first-party docs

#### GPT-5.4
Source used:
- OpenAI model page: https://developers.openai.com/api/docs/models/gpt-5.4

Confirmed:
- Standard input: $2.50 / MTok
- Standard cached input: $0.25 / MTok
- Standard output: $15.00 / MTok
- For prompts with >272K input tokens (full session pricing uplift):
  - input: $5.00 / MTok
  - cached input: $0.50 / MTok
  - output: $22.50 / MTok

Notes:
- This is the most important pricing nuance for HHX because GPT-5.4 is the default model and large-context usage is happening in telemetry.
- The dashboard currently does not yet model the >272K surcharge because it only sees aggregate token counts, not per-request context-threshold state in the cost function.

#### Claude Haiku 4.5
#### Claude Opus 4.6
#### Claude Opus 4.7
#### Claude Sonnet 4.6
Source used:
- Anthropic pricing page: https://platform.claude.com/docs/en/about-claude/pricing

Confirmed:
- Claude Haiku 4.5
  - input: $1.00 / MTok
  - cache read: $0.10 / MTok
  - cache write (5m): $1.25 / MTok
  - output: $5.00 / MTok
- Claude Opus 4.6
  - input: $5.00 / MTok
  - cache read: $0.50 / MTok
  - cache write (5m): $6.25 / MTok
  - output: $25.00 / MTok
- Claude Opus 4.7
  - input: $5.00 / MTok
  - cache read: $0.50 / MTok
  - cache write (5m): $6.25 / MTok
  - output: $25.00 / MTok
- Claude Sonnet 4.6
  - input: $3.00 / MTok
  - cache read: $0.30 / MTok
  - cache write (5m): $3.75 / MTok
  - output: $15.00 / MTok

Notes:
- Anthropic also publishes 1-hour cache write prices, but current HHX telemetry does not distinguish 5m vs 1h cache-write durations.
- For now the safest estimator is to use the 5-minute cache-write price unless we later capture cache TTL mode.

### Present in local OpenClaw config, but not yet re-verified from first-party docs in this pass

These values exist in `C:\Users\hhx-sandbox3\.openclaw\openclaw.json` already, but still need direct first-party confirmation in this workstream before being treated as authoritative:

- gpt-4.1
  - current local config: input 2, cacheRead 0.5, output 8
- gpt-4o
  - current local config: input 2.5, cacheRead 1.25, output 10
- gpt-realtime-1.5
  - current local config: input 4, output 16
- FW-GLM-5
  - current local config: input 0.6, output 1.92
- Kimi-K2.5
  - current local config: input 0.6, output 3

Notes:
- These may be correct, but they are still provisional until confirmed from first-party docs / Azure pricing pages / provider pricing pages.

---

## Recommended pricing matrix right now

### Safe to use as authoritative now

| Model | Input | Cached / Cache Read | Cache Write | Output | Confidence |
|---|---:|---:|---:|---:|---|
| gpt-5.4 | 2.50 | 0.25 | n/a | 15.00 | official |
| gpt-5.4 (>272K) | 5.00 | 0.50 | n/a | 22.50 | official |
| claude-haiku-4-5 | 1.00 | 0.10 | 1.25 | 5.00 | official |
| claude-opus-4-6 | 5.00 | 0.50 | 6.25 | 25.00 | official |
| claude-opus-4-7 | 5.00 | 0.50 | 6.25 | 25.00 | official |
| claude-sonnet-4-6 | 3.00 | 0.30 | 3.75 | 15.00 | official |

### Provisional pending first-party verification

| Model | Input | Cached / Cache Read | Cache Write | Output | Confidence |
|---|---:|---:|---:|---:|---|
| gpt-4.1 | 2.00 | 0.50 | n/a | 8.00 | provisional |
| gpt-4o | 2.50 | 1.25 | n/a | 10.00 | provisional |
| gpt-realtime-1.5 | 4.00 | unknown | n/a | 16.00 | provisional |
| FW-GLM-5 | 0.60 | unknown | n/a | 1.92 | provisional |
| Kimi-K2.5 | 0.60 | unknown | n/a | 3.00 | provisional |

---

## Billing formulas

### OpenAI-style models

Use:
- Fresh In = Input - Cached
- Cost = (Fresh In * input_rate + Cached * cached_input_rate + Out * output_rate) / 1_000_000

For GPT-5.4:
- if request input <= 272K:
  - input_rate = 2.50
  - cached_input_rate = 0.25
  - output_rate = 15.00
- if request input > 272K:
  - input_rate = 5.00
  - cached_input_rate = 0.50
  - output_rate = 22.50

### Anthropic-style models

Use:
- Cost = (Fresh In * input_rate + Cached * cache_read_rate + Cache Create * cache_write_rate + Out * output_rate) / 1_000_000

---

## Estimation risk / likely bias

### Where the estimator can overestimate
- If a model price in config is higher than actual Foundry billing
- If GPT-5.4 >272K uplift is applied too broadly to aggregated data instead of only the requests above threshold
- If Anthropic cache-write price is using 5m but actual workload is 1h or vice versa without explicit telemetry

### Where the estimator can underestimate
- If GPT-5.4 large-context uplift is ignored for requests above 272K
- If regional / data-zone uplifts apply but are not modeled
- If a provider-specific cache tier or realtime pricing nuance is missing
- If non-token tool-call charges exist and are not represented

### Biggest current accuracy limitation
The dashboard cost math is still mostly per-aggregate-row, but GPT-5.4 long-context uplift is a per-request threshold rule.

That means the most accurate GPT-5.4 costing should be calculated at the individual request/event level before aggregation.

---

## Recommended implementation order

1. Update dashboard `prices.js` with the officially grounded entries now
2. Add GPT-5.4 large-context threshold handling for per-request rows
3. Confirm first-party pricing for:
   - gpt-4.1
   - gpt-4o
   - gpt-realtime-1.5
   - FW-GLM-5
   - Kimi-K2.5
4. Mirror final rates into `C:\Users\hhx-sandbox3\.openclaw\openclaw.json`
5. Add a pricing-confidence label in docs / presentation so provisional rates are clearly marked
