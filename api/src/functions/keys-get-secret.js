const { app } = require('@azure/functions');
const { getSubscriptionSecrets, withApimAuth } = require('../shared/apim');

app.http('keys-get-secret', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'keys/{id}/key',
  handler: async (req, context) =>
    withApimAuth(async () => {
      const id = context.triggerMetadata?.id || req.params?.id;
      if (!id) {
        return {
          status: 400,
          jsonBody: { error: 'Subscription id is required' },
        };
      }
      const secrets = await getSubscriptionSecrets(id);
      return {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
        jsonBody: { apiKey: secrets.primaryKey, secondaryKey: secrets.secondaryKey },
      };
    }, req, context),
});
