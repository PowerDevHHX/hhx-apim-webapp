const { app } = require('@azure/functions');

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async () => ({
    status: 200,
    jsonBody: {
      ok: true,
      service: 'apim-hhx-gateway-api',
      time: new Date().toISOString(),
      appInsightsConfigured: Boolean(
        process.env.APPINSIGHTS_APP_ID && process.env.APPINSIGHTS_API_KEY
      ),
    },
  }),
});
