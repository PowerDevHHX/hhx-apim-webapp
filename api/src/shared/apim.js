const { requireAuth } = require('./auth');

const SUBSCRIPTION_ID = String(process.env.AZURE_SUBSCRIPTION_ID || '').trim();
const RESOURCE_GROUP = String(process.env.APIM_RESOURCE_GROUP || '').trim();
const SERVICE_NAME = String(process.env.APIM_SERVICE_NAME || '').trim();
const API_VERSION = '2024-05-01';

function getApimConfig() {
  return {
    subscriptionId: SUBSCRIPTION_ID,
    resourceGroup: RESOURCE_GROUP,
    serviceName: SERVICE_NAME,
    apiVersion: API_VERSION,
  };
}

function assertApimConfigured() {
  if (!SUBSCRIPTION_ID || !RESOURCE_GROUP || !SERVICE_NAME) {
    throw new Error('APIM management is not configured. Set AZURE_SUBSCRIPTION_ID, APIM_RESOURCE_GROUP, and APIM_SERVICE_NAME.');
  }
}

async function getAzureAccessToken() {
  const tenantId = String(process.env.AZURE_TENANT_ID || '').trim();
  const clientId = String(process.env.AZURE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.AZURE_CLIENT_SECRET || '').trim();
  const federatedTokenFile = String(process.env.AZURE_FEDERATED_TOKEN_FILE || '').trim();
  const scope = 'https://management.azure.com/.default';

  if (tenantId && clientId && federatedTokenFile) {
    const fs = require('fs');
    const assertion = fs.readFileSync(federatedTokenFile, 'utf8').trim();
    const body = new URLSearchParams({
      client_id: clientId,
      scope,
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
    });
    return fetchToken(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, body);
  }

  if (tenantId && clientId && clientSecret) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope,
      grant_type: 'client_credentials',
    });
    return fetchToken(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, body);
  }

  throw new Error('Azure auth is not configured. Set managed identity/workload identity or service principal env vars for APIM management.');
}

async function fetchToken(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Azure token request failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();
  if (!data?.access_token) throw new Error('Azure token response missing access_token');
  return data.access_token;
}

async function apimRequest(path, { method = 'GET', body } = {}) {
  assertApimConfigured();
  const token = await getAzureAccessToken();
  const url = `https://management.azure.com/subscriptions/${encodeURIComponent(SUBSCRIPTION_ID)}/resourceGroups/${encodeURIComponent(RESOURCE_GROUP)}/providers/Microsoft.ApiManagement/service/${encodeURIComponent(SERVICE_NAME)}${path}${path.includes('?') ? '&' : '?'}api-version=${API_VERSION}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`APIM request failed: ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

function normalizeGroup(value) {
  const raw = String(value || 'HUMAN').trim().toUpperCase();
  return ['HUMAN', 'AGENT', 'LAB'].includes(raw) ? raw : 'HUMAN';
}

function inferGroup(subscription) {
  const display = String(subscription?.properties?.displayName || subscription?.displayName || '').toUpperCase();
  const tags = subscription?.properties?.tags;
  if (Array.isArray(tags)) {
    const normalizedTags = tags.map((t) => String(t).toUpperCase());
    if (normalizedTags.includes('AGENT')) return 'AGENT';
    if (normalizedTags.includes('LAB')) return 'LAB';
    if (normalizedTags.includes('HUMAN')) return 'HUMAN';
  }
  if (display.includes('AGENT')) return 'AGENT';
  if (display.includes('LAB')) return 'LAB';
  return 'HUMAN';
}

function mapSubscription(sub, usersById = {}) {
  const props = sub?.properties || {};
  const owner = props.ownerId ? usersById[props.ownerId] || null : null;
  const scope = String(props.scope || '');
  return {
    id: sub.name,
    name: sub.name,
    displayName: props.displayName || sub.name,
    state: props.state || 'unknown',
    createdDate: props.createdDate || null,
    startDate: props.startDate || null,
    endDate: props.endDate || null,
    scope,
    scopeType: scope.includes('/products/') ? 'product' : scope.endsWith('/apis') ? 'all-apis' : scope.includes('/apis/') ? 'api' : 'service',
    ownerId: props.ownerId || null,
    ownerEmail: owner?.email || null,
    ownerName: owner ? [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim() || owner.email : null,
    group: inferGroup(sub),
    isBuiltin: ['master'].includes(String(sub.name || '').toLowerCase()),
    primaryKey: props.primaryKey || null,
    secondaryKey: props.secondaryKey || null,
  };
}

async function listUsers() {
  const data = await apimRequest('/users');
  const users = data?.value || [];
  const map = {};
  for (const user of users) {
    map[user.id] = {
      id: user.id,
      email: user?.properties?.email || null,
      firstName: user?.properties?.firstName || '',
      lastName: user?.properties?.lastName || '',
      state: user?.properties?.state || null,
    };
  }
  return map;
}

async function listSubscriptions() {
  const [usersById, data] = await Promise.all([
    listUsers(),
    apimRequest('/subscriptions'),
  ]);
  return (data?.value || []).map((sub) => mapSubscription(sub, usersById));
}

async function getSubscriptionSecrets(id) {
  const data = await apimRequest(`/subscriptions/${encodeURIComponent(id)}/listSecrets`, { method: 'POST' });
  return {
    primaryKey: data?.primaryKey || null,
    secondaryKey: data?.secondaryKey || null,
  };
}

async function createSubscription({ id, displayName, group, ownerId, scope, primaryKey, secondaryKey }) {
  const normalizedId = String(id || '').trim();
  const normalizedDisplayName = String(displayName || '').trim();
  if (!normalizedId || !normalizedDisplayName) {
    const err = new Error('id and displayName are required');
    err.status = 400;
    throw err;
  }

  const body = {
    properties: {
      displayName: normalizedDisplayName,
      scope: String(scope || '').trim(),
      ownerId: ownerId || undefined,
      state: 'active',
      allowTracing: false,
      primaryKey: primaryKey || undefined,
      secondaryKey: secondaryKey || undefined,
      tags: [normalizeGroup(group)],
    },
  };

  await apimRequest(`/subscriptions/${encodeURIComponent(normalizedId)}`, { method: 'PUT', body });
  const usersById = await listUsers();
  const created = await apimRequest(`/subscriptions/${encodeURIComponent(normalizedId)}`);
  return mapSubscription(created, usersById);
}

async function deleteSubscription(id) {
  return apimRequest(`/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function withApimAuth(handler, req, context) {
  const auth = await requireAuth(req, context);
  if (auth?.status) return auth;

  try {
    return await handler(auth.user);
  } catch (err) {
    context?.error?.(`APIM handler failed: ${err.message}`);
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    return {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      jsonBody: { error: err.message || 'APIM request failed' },
    };
  }
}

module.exports = {
  getApimConfig,
  listSubscriptions,
  getSubscriptionSecrets,
  createSubscription,
  deleteSubscription,
  normalizeGroup,
  withApimAuth,
};
