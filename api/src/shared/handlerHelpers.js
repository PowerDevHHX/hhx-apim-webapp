const { queryAppInsights } = require('./appInsights');
const { requireAuth } = require('./auth');

/**
 * Standard handler: enforce auth, run a KQL query, optionally post-process rows, return JSON.
 * Catches/normalizes errors so frontend gets a clean shape.
 *
 * @param {object} args
 * @param {string} args.query - KQL string
 * @param {(row: any) => any} [args.transform] - per-row mapping
 * @param {(rows: any[]) => any} [args.finalize] - final shaping of the array
 */
async function runQueryHandler({ query, transform, finalize }, req, context) {
  const auth = await requireAuth(req, context);
  if (auth?.status) return auth;

  try {
    let rows = await queryAppInsights(query);
    if (transform) rows = rows.map(transform);
    const body = finalize ? finalize(rows) : rows;
    return {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
      jsonBody: body,
    };
  } catch (err) {
    context?.error?.(`Query handler failed: ${err.message}`);
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    return {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
      jsonBody: { error: err.message || 'query failed' },
    };
  }
}

module.exports = { runQueryHandler, requireAuth };
