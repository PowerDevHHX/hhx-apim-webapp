const { app } = require('@azure/functions');
const { createSubscription, getApimConfig, normalizeGroup, withApimAuth } = require('../shared/apim');

app.http('keys-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'keys',
  handler: async (req, context) =>
    withApimAuth(async () => {
      const body = await req.json().catch(() => ({}));
      const rawId = String(body?.id || '').trim();
      const displayName = String(body?.displayName || '').trim();
      const group = normalizeGroup(body?.group);
      const ownerId = body?.ownerId ? String(body.ownerId).trim() : null;
      const scope = body?.scope ? String(body.scope).trim() : null;

      if (!rawId || !displayName) {
        return {
          status: 400,
          jsonBody: { error: 'id and displayName are required' },
        };
      }

      const id = rawId.startsWith('hhx-') ? rawId : `hhx-${rawId}`;
      const suffix = group === 'AGENT' ? ' AGENT' : group === 'LAB' ? ' LAB' : '';
      const normalizedDisplayName = suffix && !displayName.toUpperCase().endsWith(suffix.trim())
        ? `${displayName}${suffix}`
        : displayName;

      const cfg = getApimConfig();
      const defaultScope = `/subscriptions/${cfg.subscriptionId}/resourceGroups/${cfg.resourceGroup}/providers/Microsoft.ApiManagement/service/${cfg.serviceName}/apis`;
      const created = await createSubscription({
        id,
        displayName: normalizedDisplayName,
        group,
        ownerId,
        scope: scope || defaultScope,
      });

      return {
        status: 201,
        headers: {
          'Cache-Control': 'no-store',
        },
        jsonBody: {
          ...created,
          endpoint: 'https://hhx-ai-gateway.azure-api.net/hhx-ai-models/openai/v1',
        },
      };
    }, req, context),
});
