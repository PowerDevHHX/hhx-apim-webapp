# APIM Key Management — Azure Setup

This is the exact Azure-side work you need to do so the dashboard's
"Manage API Keys" page can:

- pull existing APIM subscriptions (always)
- create and delete APIM subscriptions (optional)

You pick one option below. Both reuse your existing telemetry Function
App. You do **not** need to change the telemetry code.

---

## Resources we are touching (already exist, just for reference)

- Tenant ID: `eb00ff1d-bc6e-4700-a2b4-fe866ad36108`
- Subscription ID: `c27ccbbe-53a7-4b61-9441-b26f22f791ba`
- Resource group: `hhx-ai-foundry-ea`
- APIM service: `hhx-api-management`
- API: `hhx-ai-gateway` (path `/gateway`)
- Function App hosting `/api/*` for the dashboard

---

## Step 1 — Set app settings on the Function App / SWA API

Portal path:

`Function App → Settings → Environment variables → Application settings`
or
`Static Web App → Configuration → Application settings`

Add these settings (any host that runs the dashboard's `/api`):

| Name | Value |
|------|-------|
| `AZURE_SUBSCRIPTION_ID` | `c27ccbbe-53a7-4b61-9441-b26f22f791ba` |
| `APIM_RESOURCE_GROUP` | `hhx-ai-foundry-ea` |
| `APIM_SERVICE_NAME` | `hhx-api-management` |

Save and restart the Function App.

After this step the dashboard can find APIM. It still cannot call ARM
until step 2.

---

## Step 2 — Give the Function App permission to talk to APIM

Pick **one** of the two options.

### Option A — Read only (list keys on dashboard, create in portal)

Use this if you don't want the dashboard to ever write to APIM.

1. Function App → **Identity** → **System assigned** → set Status =
   **On** → Save.
2. Copy the **Object (principal) ID** that appears.
3. Go to APIM: `hhx-api-management` → **Access control (IAM)** → **Add**
   → **Add role assignment**.
4. Role: **Reader**
5. Assign access to: **Managed identity**
6. Members: the Function App identity from step 2.
7. Save.

Result:

- `GET /api/keys` works (list subscriptions)
- `GET /api/keys/:id/key` will fail (Reader cannot reveal secrets)
- `POST /api/keys` and `DELETE /api/keys/:id` will fail (read only)

You create new keys through the APIM portal manually.

### Option B — Full management (create/list/delete on dashboard)

Use this if you want the dashboard to fully manage keys.

1. Function App → **Identity** → **System assigned** → set Status =
   **On** → Save.
2. Copy the **Object (principal) ID** that appears.
3. APIM `hhx-api-management` → **Access control (IAM)** → **Add** →
   **Add role assignment**.
4. Role: **API Management Service Contributor**
5. Assign access to: **Managed identity**
6. Members: the Function App identity from step 2.
7. Save.

That role can:

- list subscriptions
- create subscriptions
- delete subscriptions
- call `listSecrets` to reveal the API key

If Option B feels like too much access, Option A is perfectly fine and
the dashboard will degrade gracefully — listing works, the "Create" and
"Delete" buttons will just return an error from APIM.

---

## Step 3 — Tell me which option you picked

I keyed off the same env vars for both options. The code automatically
uses managed identity when running inside Azure. No code change needed
between A and B — it's purely Azure permissions.

If you ever want to remove the dashboard's write ability later, just
downgrade the role from "API Management Service Contributor" to
"Reader" in IAM. No redeploy required.

---

## What I will NOT change

- existing telemetry Function code — untouched
- existing APIM API/policy resources — untouched
- existing APIM subscriptions — untouched

The new files are only:

- `api/src/shared/apim.js`
- `api/src/functions/keys-list.js`
- `api/src/functions/keys-get-secret.js`
- `api/src/functions/keys-create.js`
- `api/src/functions/keys-delete.js`

---

## Verification commands (read only, safe to run)

```bash
az rest --method get \
  --url "https://management.azure.com/subscriptions/c27ccbbe-53a7-4b61-9441-b26f22f791ba/resourceGroups/hhx-ai-foundry-ea/providers/Microsoft.ApiManagement/service/hhx-api-management/subscriptions?api-version=2024-05-01"

az rest --method get \
  --url "https://management.azure.com/subscriptions/c27ccbbe-53a7-4b61-9441-b26f22f791ba/resourceGroups/hhx-ai-foundry-ea/providers/Microsoft.ApiManagement/service/hhx-api-management/users?api-version=2024-05-01"
```

Both already work for you locally as `powerdev@HHXHub.com`.
