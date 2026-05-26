const { app } = require('@azure/functions');
const { LIVE_FEED } = require('../shared/queries');
const { runQueryHandler } = require('../shared/handlerHelpers');

app.http('usage-live-feed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/live-feed',
  handler: async (_req, context) => runQueryHandler({ query: LIVE_FEED }, context),
});
