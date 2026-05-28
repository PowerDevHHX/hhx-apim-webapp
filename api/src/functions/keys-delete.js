const { app } = require('@azure/functions');
const { deleteSubscription, withApimAuth } = require('../shared/apim');

app.http('keys-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'keys/{id}',
  handler: async (req, context) =>
    withApimAuth(async () => {
      const id = context.triggerMetadata?.id || req.params?.id;
      if (!id) {
        return {
          status: 400,
          jsonBody: { error: 'Subscription id is required' },
        };
      }

      await deleteSubscription(id);
      return {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
        jsonBody: { ok: true },
      };
    }, req, context),
});
