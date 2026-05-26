const { queryAppInsights } = require('./appInsights');

/**
 * Standard handler: run a KQL query, optionally post-process rows, return JSON.
 * Catches/normalizes errors so frontend gets a clean shape.
 *
 * @param {object} args
 * @param {string} args.query - KQL string
 * @param {(row: any) => any} [args.transform] - per-row mapping
 * @param {(rows: any[]) => any} [args.finalize] - final shaping of the array
 */
async function runQueryHandler({ query, transform, finalize }, context) {
  try {
    let rows = await queryAppInsights(query);
    if (transform) rows = rows.map(transform);
    const body = finalize ? finalize(rows) : rows;
    return {
      status: 200,
      jsonBody: body,
    };
  } catch (err) {
    context?.log?.error?.(`Query handler failed: ${err.message}`);
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    return {
      status,
      jsonBody: { error: err.message || 'query failed' },
    };
  }
}

module.exports = { runQueryHandler };
