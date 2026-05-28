const { app } = require('@azure/functions');
const { byModelQuery } = require('../shared/queries');
const { runQueryHandler } = require('../shared/handlerHelpers');

app.http('usage-by-model', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'usage/by-model',
  handler: async (req, context) => {
    const window = req.query.get('window') || '1mo';
    return runQueryHandler(
      {
        query: byModelQuery(window),
        transform: (rows) => rows,
      },
      req,
      context
    );
  },
});
