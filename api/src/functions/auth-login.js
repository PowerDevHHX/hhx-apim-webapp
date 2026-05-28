const { app } = require('@azure/functions');
const {
  buildCookie,
  createSessionValue,
  getAuthConfig,
  isAuthConfigured,
  validateCredentials,
} = require('../shared/auth');

app.http('auth-login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
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

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');

    if (!validateCredentials(username, password)) {
      return {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
        },
        jsonBody: { error: 'Invalid username or password.' },
      };
    }

    const { secret } = getAuthConfig();
    const cookie = buildCookie(createSessionValue(username, secret));

    return {
      status: 200,
      headers: {
        'Set-Cookie': cookie,
        'Cache-Control': 'no-store',
      },
      jsonBody: {
        ok: true,
        user: { username },
      },
    };
  },
});
