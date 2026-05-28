# Dashboard API (SWA managed functions)

Backs the dashboard at `/api/usage/*`. Each endpoint runs a KQL query against
Application Insights (`hhx-api-insights`) and returns aggregated JSON.

## Endpoints

| Method | Path | Source |
|---|---|---|
| GET | `/api/health` | static — used to verify config |
| POST | `/api/auth/login` | issues signed session cookie |
| GET | `/api/auth/me` | returns current authenticated user |
| POST | `/api/auth/logout` | clears session cookie |
| GET | `/api/usage/daily` | today (UTC) by developer + model |
| GET | `/api/usage/monthly` | this calendar month by developer + model |
| GET | `/api/usage/realtime` | last 5 minutes by developer + model |
| GET | `/api/usage/trend` | last 24h, 30m buckets, per developer |
| GET | `/api/usage/by-model` | today by model (pie chart source) |
| GET | `/api/usage/live-feed` | last 60m of individual requests (max 200) |

All `/api/usage/*` endpoints require login. `daily` and `monthly` enrich rows with `est_cost_usd` from `shared/prices.js`.

## Required SWA app settings

Set in Azure Portal → Static Web App → Configuration → Application settings:

| Name | Value |
|---|---|
| `APPINSIGHTS_APP_ID` | from `hhx-api-insights` → Configure → API Access → Application ID |
| `APPINSIGHTS_API_KEY` | create in same blade with "Read telemetry" scope only |
| `AUTH_USERNAME` | shared dashboard login username |
| `AUTH_PASSWORD` | shared dashboard login password |
| `AUTH_SESSION_SECRET` | long random string used to sign the session cookie |

After saving, the API redeploys/restarts automatically.

## Updating model prices

Edit `src/shared/prices.js`. Push to `main`. SWA redeploys the API. No infra change needed.

Prices are USD per 1,000,000 tokens, separate input/output. Anthropic prompt-cache
read/write tiers and provider-specific service tiers are not modeled yet.
