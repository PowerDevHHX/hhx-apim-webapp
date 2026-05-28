const { app } = require('@azure/functions');
const { REALTIME } = require('../shared/queries');
const { runQueryHandler } = require('../shared/handlerHelpers');

app.http('usage-realtime', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/realtime',
  handler: async (req, context) => runQueryHandler({ query: REALTIME }, req, context),
});
