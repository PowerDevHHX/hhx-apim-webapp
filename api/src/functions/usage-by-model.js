const { app } = require('@azure/functions');
const { BY_MODEL } = require('../shared/queries');
const { runQueryHandler } = require('../shared/handlerHelpers');

app.http('usage-by-model', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/by-model',
  handler: async (req, context) => runQueryHandler({ query: BY_MODEL }, req, context),
});
