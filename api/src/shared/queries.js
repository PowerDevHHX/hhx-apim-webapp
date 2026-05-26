// All KQL queries live here so the function handlers stay tiny.
//
// Schema reminder (from APIM telemetry function):
//   customEvents.name in ('AIUsage', 'AIUsageError')
//   customDimensions.{ provider, model, developer, userEmail, subscriptionName,
//                      backendId, operation, statusCode, ... }
//   customMeasurements.{ promptTokens, completionTokens, totalTokens }

// Today (UTC) — per user / per model aggregates.
const DAILY = `
customEvents
| where name == "AIUsage" and timestamp > startofday(now())
| extend
    developer = tostring(customDimensions.developer),
    model     = tostring(customDimensions.model),
    promptT   = toint(customMeasurements.promptTokens),
    completeT = toint(customMeasurements.completionTokens),
    totalT    = toint(customMeasurements.totalTokens)
| summarize
    calls         = count(),
    input_tokens  = sum(promptT),
    output_tokens = sum(completeT),
    total_tokens  = sum(totalT)
  by developer, model
| order by total_tokens desc
`;

// This calendar month (UTC) — per user / per model aggregates.
const MONTHLY = `
customEvents
| where name == "AIUsage" and timestamp >= startofmonth(now())
| extend
    developer = tostring(customDimensions.developer),
    model     = tostring(customDimensions.model),
    promptT   = toint(customMeasurements.promptTokens),
    completeT = toint(customMeasurements.completionTokens),
    totalT    = toint(customMeasurements.totalTokens)
| summarize
    calls         = count(),
    input_tokens  = sum(promptT),
    output_tokens = sum(completeT),
    total_tokens  = sum(totalT)
  by developer, model
| order by total_tokens desc
`;

// Last 5 minutes — per user / per model.
const REALTIME = `
customEvents
| where name == "AIUsage" and timestamp > ago(5m)
| extend
    developer = tostring(customDimensions.developer),
    model     = tostring(customDimensions.model),
    promptT   = toint(customMeasurements.promptTokens),
    completeT = toint(customMeasurements.completionTokens)
| summarize
    calls         = count(),
    input_tokens  = sum(promptT),
    output_tokens = sum(completeT)
  by developer, model
| order by calls desc
`;

// Last 24 hours bucketed into 30-minute slots, one row per developer per slot.
const TREND_24H = `
customEvents
| where name == "AIUsage" and timestamp > ago(24h)
| extend
    developer = tostring(customDimensions.developer),
    totalT    = toint(customMeasurements.totalTokens)
| summarize tokens = sum(totalT) by bin(timestamp, 30m), developer
| order by timestamp asc
`;

// Today — per model totals (for the pie chart).
const BY_MODEL = `
customEvents
| where name == "AIUsage" and timestamp > startofday(now())
| extend
    model  = tostring(customDimensions.model),
    totalT = toint(customMeasurements.totalTokens)
| summarize total_tokens = sum(totalT) by model
| order by total_tokens desc
`;

// Last 60 minutes — individual request feed.
const LIVE_FEED = `
customEvents
| where name == "AIUsage" and timestamp > ago(60m)
| extend
    developer    = tostring(customDimensions.developer),
    model        = tostring(customDimensions.model),
    prompt_tokens  = toint(customMeasurements.promptTokens),
    output_tokens  = toint(customMeasurements.completionTokens),
    total_tokens   = toint(customMeasurements.totalTokens)
| project timestamp, developer, model, prompt_tokens, output_tokens, total_tokens
| order by timestamp desc
| take 200
`;

module.exports = { DAILY, MONTHLY, REALTIME, TREND_24H, BY_MODEL, LIVE_FEED };
