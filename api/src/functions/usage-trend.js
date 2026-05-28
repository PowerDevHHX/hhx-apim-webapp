const { app } = require('@azure/functions');
const { TREND_24H, trendQuery } = require('../shared/queries');
const { runQueryHandler } = require('../shared/handlerHelpers');

app.http('usage-trend', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/trend',
  handler: async (req, context) => {
    const window = req.query.get('window');
    const groupBy = req.query.get('groupBy') || 'developer';
    const query = window ? trendQuery(window, groupBy) : TREND_24H;
    return runQueryHandler({ query }, req, context);
  },
});
