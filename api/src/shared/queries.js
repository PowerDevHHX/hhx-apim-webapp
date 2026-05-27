// All KQL queries live here so the function handlers stay tiny.
//
// Schema reminder (from APIM telemetry function):
//   customEvents.name in ('AIUsage', 'AIUsageError')
//   customDimensions.{ provider, model, developer, userEmail, subscriptionName,
//                      backendId, operation, statusCode, ... }
//   customMeasurements.{ promptTokens, completionTokens, totalTokens,
//                        freshPromptTokens, cachedPromptTokens, cacheCreationTokens }
//
// Manual cleanup note:
//   Exclude old PowerShell/manual test rows from dashboard queries by filtering
//   developer == 'drew@manual'. This hides them from the dashboard without
//   deleting raw telemetry from App Insights.

const BASE_USAGE_FILTER = `
customEvents
| where name == "AIUsage"
| extend
    developerRaw = tostring(customDimensions.developer),
    developer = iff(isempty(trim(' ', developerRaw)), "unknown", developerRaw),
    provider  = tostring(customDimensions.provider),
    model     = tostring(customDimensions.model),
    statusCode = toint(customDimensions.statusCode),
    isStream  = tostring(customDimensions.isStream),
    responseId = tostring(customDimensions.responseId),
    promptT   = toint(customMeasurements.promptTokens),
    completeT = toint(customMeasurements.completionTokens),
    totalT    = toint(customMeasurements.totalTokens),
    freshPromptT = toint(customMeasurements.freshPromptTokens),
    cachedPromptT = toint(customMeasurements.cachedPromptTokens),
    cacheCreationT = toint(customMeasurements.cacheCreationTokens)
| where developer != "drew@manual"
`;

// Today (UTC) — per user / per model aggregates.
const DAILY = `
${BASE_USAGE_FILTER}
| where timestamp > startofday(now())
| summarize
    calls                 = count(),
    success_calls         = countif(statusCode >= 200 and statusCode < 300),
    failed_calls          = countif(statusCode < 200 or statusCode >= 300),
    rate_limited_calls    = countif(statusCode == 429),
    input_tokens          = sum(promptT),
    output_tokens         = sum(completeT),
    total_tokens          = sum(totalT),
    fresh_prompt_tokens   = sum(freshPromptT),
    cached_prompt_tokens  = sum(cachedPromptT),
    cache_creation_tokens = sum(cacheCreationT)
  by developer, provider, model
| order by total_tokens desc
`;

// This calendar month (UTC) — per user / per model aggregates.
const MONTHLY = `
${BASE_USAGE_FILTER}
| where timestamp >= startofmonth(now())
| summarize
    calls                 = count(),
    success_calls         = countif(statusCode >= 200 and statusCode < 300),
    failed_calls          = countif(statusCode < 200 or statusCode >= 300),
    rate_limited_calls    = countif(statusCode == 429),
    input_tokens          = sum(promptT),
    output_tokens         = sum(completeT),
    total_tokens          = sum(totalT),
    fresh_prompt_tokens   = sum(freshPromptT),
    cached_prompt_tokens  = sum(cachedPromptT),
    cache_creation_tokens = sum(cacheCreationT)
  by developer, provider, model
| order by total_tokens desc
`;

// Last 5 minutes — per user / per model.
const REALTIME = `
${BASE_USAGE_FILTER}
| where timestamp > ago(5m)
| summarize
    calls                 = count(),
    success_calls         = countif(statusCode >= 200 and statusCode < 300),
    failed_calls          = countif(statusCode < 200 or statusCode >= 300),
    rate_limited_calls    = countif(statusCode == 429),
    input_tokens          = sum(promptT),
    output_tokens         = sum(completeT),
    total_tokens          = sum(totalT),
    fresh_prompt_tokens   = sum(freshPromptT),
    cached_prompt_tokens  = sum(cachedPromptT),
    cache_creation_tokens = sum(cacheCreationT)
  by developer, provider, model
| order by calls desc
`;

// Last 24 hours bucketed into 30-minute slots, one row per developer per slot.
const TREND_24H = `
${BASE_USAGE_FILTER}
| where timestamp > ago(24h)
| summarize tokens = sum(totalT) by bin(timestamp, 30m), developer
| order by timestamp asc
`;

// Today — per model totals (for the pie chart).
const BY_MODEL = `
${BASE_USAGE_FILTER}
| where timestamp > startofday(now())
| summarize total_tokens = sum(totalT) by model
| order by total_tokens desc
`;

// Last 60 minutes — individual request feed.
const LIVE_FEED = `
${BASE_USAGE_FILTER}
| where timestamp > ago(60m)
| project timestamp, developer, provider, model, statusCode, isStream, responseId,
          prompt_tokens=promptT, output_tokens=completeT, total_tokens=totalT,
          fresh_prompt_tokens=freshPromptT, cached_prompt_tokens=cachedPromptT,
          cache_creation_tokens=cacheCreationT
| order by timestamp desc
| take 200
`;

const WINDOWS = {
  '5m': '5m',
  '30m': '30m',
  '1h': '1h',
  '5h': '5h',
  '8h': '8h',
  '1d': '1d',
  '1w': '7d',
  '1mo': '30d',
};

function usageSummaryQuery(windowKey = '1d') {
  const duration = WINDOWS[windowKey] || WINDOWS['1d'];
  return `
${BASE_USAGE_FILTER}
| where timestamp > ago(${duration})
| summarize
    calls                 = count(),
    success_calls         = countif(statusCode >= 200 and statusCode < 300),
    failed_calls          = countif(statusCode < 200 or statusCode >= 300),
    rate_limited_calls    = countif(statusCode == 429),
    active_users          = dcount(developer),
    active_models         = dcount(model),
    input_tokens          = sum(promptT),
    output_tokens         = sum(completeT),
    total_tokens          = sum(totalT),
    fresh_prompt_tokens   = sum(freshPromptT),
    cached_prompt_tokens  = sum(cachedPromptT),
    cache_creation_tokens = sum(cacheCreationT)
  by provider
| order by total_tokens desc
`;
}

module.exports = { DAILY, MONTHLY, REALTIME, TREND_24H, BY_MODEL, LIVE_FEED, usageSummaryQuery, WINDOWS };
