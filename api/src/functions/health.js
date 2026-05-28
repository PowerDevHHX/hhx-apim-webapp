const { app } = require('@azure/functions');
const { isAuthConfigured } = require('../shared/auth');

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async () => ({
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
    jsonBody: {
      ok: true,
      service: 'apim-hhx-gateway-api',
      time: new Date().toISOString(),
      appInsightsConfigured: Boolean(
        process.env.APPINSIGHTS_APP_ID && process.env.APPINSIGHTS_API_KEY
      ),
      authConfigured: isAuthConfigured(),
    },
  }),
});
