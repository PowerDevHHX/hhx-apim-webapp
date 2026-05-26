const { app } = require('@azure/functions');
const { DAILY } = require('../shared/queries');
const { estimateCost } = require('../shared/prices');
const { runQueryHandler } = require('../shared/handlerHelpers');

app.http('usage-daily', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/daily',
  handler: async (_req, context) =>
    runQueryHandler(
      {
        query: DAILY,
        transform: (r) => ({
          ...r,
          est_cost_usd: estimateCost(r.model, r.input_tokens, r.output_tokens),
        }),
      },
      context
    ),
});
