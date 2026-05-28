const crypto = require('crypto');

const COOKIE_NAME = 'apim_auth';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getEnv(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function getAuthConfig() {
  return {
    username: getEnv('AUTH_USERNAME'),
    password: getEnv('AUTH_PASSWORD'),
    secret: getEnv('AUTH_SESSION_SECRET'),
  };
}

function isAuthConfigured() {
  const { username, password, secret } = getAuthConfig();
  return Boolean(username && password && secret);
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function parseCookies(req) {
  const header = req.headers.get('cookie') || '';
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return acc;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLength), 'base64').toString('utf8');
}

function sign(value, secret) {
  return toBase64Url(crypto.createHmac('sha256', secret).update(value).digest());
}

function createSessionValue(username, secret) {
  const payload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

function verifySessionValue(sessionValue, secret) {
  if (!sessionValue || !secret) return null;
  const [encoded, signature] = String(sessionValue).split('.');
  if (!encoded || !signature) return null;
  const expected = sign(encoded, secret);
  if (!safeEqual(signature, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(encoded));
  } catch {
    return null;
  }

  if (!payload?.u || !payload?.exp) return null;
  if (Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function buildCookie(value, maxAge = SESSION_TTL_SECONDS) {
  const secure = String(process.env.NODE_ENV).toLowerCase() === 'production' ? 'Secure; ' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=${maxAge}`;
}

function clearCookie() {
  const secure = String(process.env.NODE_ENV).toLowerCase() === 'production' ? 'Secure; ' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=0`;
}

function validateCredentials(username, password) {
  const config = getAuthConfig();
  if (!config.username || !config.password) return false;
  return safeEqual(username, config.username) && safeEqual(password, config.password);
}

function getAuthenticatedUser(req) {
  const { secret } = getAuthConfig();
  const cookies = parseCookies(req);
  const sessionValue = cookies[COOKIE_NAME];
  const payload = verifySessionValue(sessionValue, secret);
  return payload ? { username: payload.u } : null;
}

function unauthorized(message = 'Unauthorized') {
  return {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    jsonBody: { error: message },
  };
}

async function requireAuth(req, context) {
  if (!isAuthConfigured()) {
    context?.error?.('Auth is not configured. Set AUTH_USERNAME, AUTH_PASSWORD, and AUTH_SESSION_SECRET.');
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      jsonBody: { error: 'Auth is not configured on the server.' },
    };
  }

  const user = getAuthenticatedUser(req);
  if (!user) return unauthorized();
  return { user };
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
  buildCookie,
  clearCookie,
  createSessionValue,
  getAuthConfig,
  getAuthenticatedUser,
  isAuthConfigured,
  requireAuth,
  unauthorized,
  validateCredentials,
};
