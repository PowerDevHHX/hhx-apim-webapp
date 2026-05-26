const { app } = require('@azure/functions');
const { TREND_24H } = require('../shared/queries');
const { runQueryHandler } = require('../shared/handlerHelpers');

app.http('usage-trend', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/trend',
  handler: async (_req, context) => runQueryHandler({ query: TREND_24H }, context),
});
