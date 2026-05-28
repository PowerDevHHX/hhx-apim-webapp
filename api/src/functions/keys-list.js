const { app } = require('@azure/functions');
const { listSubscriptions, withApimAuth } = require('../shared/apim');

app.http('keys-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'keys',
  handler: async (req, context) =>
    withApimAuth(async () => {
      const rows = await listSubscriptions();
      return {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
        jsonBody: rows,
      };
    }, req, context),
});
