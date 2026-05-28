# APIM Metrics Explainer

_Last updated: 2026-05-28_

This doc explains the dashboard metrics in plain English so they can be used in the Friday presentation.

## Core idea

The dashboard is showing **gateway requests**, not "human prompts".

That distinction matters.

A single visible user action can turn into multiple tracked API calls when:
- the client retries
- the app makes parallel requests
- the tool / agent runtime fans out work
- the UI refreshes or polls
- a conversation sends repeated follow-up turns quickly

So:
- **1 human prompt** != **1 API call**
- the `Calls` metric is counting **requests that reached the model endpoint**

## Metric definitions

### Calls
Number of API requests recorded by telemetry.

For aggregated views:
- `Calls = count of AIUsage events`

For the live feed:
- each row is one request
- multiple rows close together usually means multiple model requests were made, even if the user only remembers one visible interaction

### In
Input tokens sent to the model for that request.

Provider semantics differ:

#### OpenAI
`In` is the full prompt size for that request.

That means:
- current user message
- prior conversation history included in the request
- system prompt / hidden instructions
- tool context or other injected context
- cached prompt portions still count toward total prompt size, even if billed at a discount

Formula:
- `In = prompt_tokens`

#### Anthropic
Anthropic reports prompt parts separately.

Formula:
- `In = fresh input + cache read + cache creation`

Where:
- `fresh input` = newly billed uncached input
- `cache read` = prompt tokens served from cache
- `cache creation` = tokens written into cache for future reuse

### Cached
Prompt tokens served from cache.

This means the provider recognized repeated prompt prefix/context and reused it.

#### OpenAI
- `Cached` is a **subset of In**
- `In already includes Cached`

So for OpenAI:
- `Fresh input = In - Cached`

#### Anthropic
- `Cached` means cache reads only
- this is also a subset of total prompt size

### Cache Create
Prompt tokens written into cache so future requests can reuse them.

Important:
- this is mainly an **Anthropic concept** in the current dashboard
- OpenAI telemetry in this project does **not** currently expose a separate cache-create metric

So right now:
- OpenAI rows usually show `Cache Create = 0`
- Anthropic rows may show non-zero cache creation

### Out
Output / completion tokens returned by the model.

Formula:
- OpenAI: `completion_tokens`
- Anthropic: `output_tokens`

### Total
Total billed/request tokens for the row.

Formula:
- `Total = In + Out`

For OpenAI, this usually matches provider `total_tokens`.
For Anthropic, we derive it from the normalized telemetry fields.

### Cache Hit
How much of the prompt came from cache.

Formula:
- `Cache Hit = Cached / In`

Interpretation:
- 0% = no cache reuse
- high % = most of the prompt was reused from prior context

### Est. Cost
Estimated cost using model pricing config.

Important:
- this is only as good as the pricing table
- if the pricing table is incomplete or stale, cost can be wrong even if token counts are right

## Why input tokens keep climbing in the live feed

This is the key thing that looks scary but may still be correct.

Example pattern from the live feed:
- 9:08:20 → ~9,966 input tokens
- 9:16:34 → ~34,877 input tokens
- 9:34:33 → ~51,031 input tokens
- 9:42:00 → ~56,849 input tokens

That pattern means the request payload is carrying forward a growing amount of prior context.

In other words:
- request N includes more history than request N-1
- so the full prompt size keeps increasing

For OpenAI specifically, the rows strongly suggest:
- a large conversation/session context is being resent repeatedly
- most of that context is being cache-hit
- only a smaller fraction is fresh each time

## What the pasted sample shows

Using the 65 live-feed rows pasted in chat:

- Calls: **65**
- Sum Input: **2,256,366**
- Sum Cached: **2,031,360**
- Sum Output: **17,389**
- Sum Total: **2,273,755**
- Sum Fresh Input (`In - Cached`): **225,006**
- Average Input per call: **34,713**

## What that means in plain English

For those 65 calls:
- the dashboard is not showing 2.25M *fresh* input tokens
- it is showing 2.25M **total prompt tokens transmitted across requests**
- and about **2.03M of them were cache hits**
- only about **225k tokens were fresh input**

That is a huge difference.

So the scary number is mostly:
- repeated long context
- reused through cache
- counted each request because the full prompt is sent each request

## Why 10 million tokens can happen faster than it feels like

Because the dashboard is summing **all prompt tokens across all requests**, not just new human text.

If a conversation has ~50k prompt tokens and it gets sent 200 times, that alone is ~10M input tokens of traffic.

Example:
- 50,000 input tokens/request
- 200 requests
- = 10,000,000 input tokens total

That does **not** mean the human typed 10M new tokens.
It means the system transmitted ~10M total prompt tokens over many requests.

## Why a single prompt can look like multiple calls

Possible reasons:
- retries after transient failures
- multiple model requests inside one assistant action
- agent/tool fan-out
- background requests
- streaming and follow-up requests in the same visible interaction
- UI refreshes or multiple components loading data

In this dashboard, `Calls` tracks gateway requests, not visible button presses.

## OpenAI vs Anthropic cache semantics

### OpenAI
- `In` already includes cached prompt tokens
- `Cached` is a discounted subset of `In`
- `Fresh = In - Cached`
- `Cache Create` is not currently a separate metric here

### Anthropic
- `In = fresh + cache read + cache creation`
- `Cached` = cache reads
- `Cache Create` = cache writes
- both are separate first-class metrics

## Known dashboard issue to fix

The dashboard currently compares different time windows in different sections:
- some views are "today"
- some are selected rolling window

That makes numbers look inconsistent even when telemetry is accurate.

This should be fixed so comparison views use the same selected window.

## Presentation-safe summary

If asked why tokens seem so high:

> The dashboard counts total API traffic, not just newly typed prompt text. With long conversations, the full prompt context is resent on each request. Most of that reused context is cache-hit, which is why cached tokens are so high. So a large total input token number does not mean someone typed that many new tokens in one hour — it means the system transmitted that much total prompt context across many requests.
