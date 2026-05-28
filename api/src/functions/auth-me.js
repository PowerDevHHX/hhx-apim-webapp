const { app } = require('@azure/functions');
const { getAuthenticatedUser, isAuthConfigured, unauthorized } = require('../shared/auth');

app.http('auth-me', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/me',
  handler: async (req, context) => {
    if (!isAuthConfigured()) {
      context?.error?.('Auth is not configured. Set AUTH_USERNAME, AUTH_PASSWORD, and AUTH_SESSION_SECRET.');
      return {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
        jsonBody: { error: 'Auth is not configured on the server.' },
      };
    }

    const user = getAuthenticatedUser(req);
    if (!user) return unauthorized();

    return {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
      jsonBody: {
        authenticated: true,
        user,
      },
    };
  },
});
