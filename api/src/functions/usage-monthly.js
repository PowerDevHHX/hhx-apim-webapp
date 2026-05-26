const { app } = require('@azure/functions');
const { MONTHLY } = require('../shared/queries');
const { estimateCost } = require('../shared/prices');
const { runQueryHandler } = require('../shared/handlerHelpers');

app.http('usage-monthly', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/monthly',
  handler: async (_req, context) =>
    runQueryHandler(
      {
        query: MONTHLY,
        transform: (r) => ({
          ...r,
          est_cost_usd: estimateCost(r.model, r.input_tokens, r.output_tokens),
        }),
      },
      context
    ),
});
