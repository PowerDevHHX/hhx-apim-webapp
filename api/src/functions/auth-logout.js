const { app } = require('@azure/functions');
const { clearCookie } = require('../shared/auth');

app.http('auth-logout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/logout',
  handler: async () => ({
    status: 200,
    headers: {
      'Set-Cookie': clearCookie(),
      'Cache-Control': 'no-store',
    },
    jsonBody: { ok: true },
  }),
});
