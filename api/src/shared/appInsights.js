// Thin wrapper around the App Insights REST query API.
//
// Why REST not SDK:
//   - one fetch per query, no node_modules bloat
//   - simple API-key auth, no AAD/managed-identity setup
//   - shape of the response is predictable
//
// Required env vars (set as SWA app settings in production):
//   APPINSIGHTS_APP_ID   - "Application ID" from App Insights → Configure → API Access
//   APPINSIGHTS_API_KEY  - API key created with "Read telemetry" scope only
//
// Docs: https://learn.microsoft.com/azure/azure-monitor/app/api/api-overview

const APP_ID = process.env.APPINSIGHTS_APP_ID;
const API_KEY = process.env.APPINSIGHTS_API_KEY;

function assertConfigured() {
  if (!APP_ID || !API_KEY) {
    throw new Error(
      'App Insights query is not configured. Set APPINSIGHTS_APP_ID and APPINSIGHTS_API_KEY app settings.'
    );
  }
}

/**
 * Run a KQL query against App Insights and return a normalized array of row objects.
 * @param {string} query - KQL query string
 * @returns {Promise<Array<Record<string, any>>>}
 */
async function queryAppInsights(query) {
  assertConfigured();

  const url = `https://api.applicationinsights.io/v1/apps/${encodeURIComponent(APP_ID)}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`App Insights query failed: ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const table = data?.tables?.[0];
  if (!table) return [];

  const cols = table.columns.map((c) => c.name);
  return table.rows.map((row) => {
    const obj = {};
    cols.forEach((name, i) => {
      obj[name] = row[i];
    });
    return obj;
  });
}

module.exports = { queryAppInsights };
