import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 7001;

app.use(cors());
app.use(express.json());

const usageEvents = [];

let keys = [];

const daily = [];
const monthly = [];
const realtime = [];
const trend = [];
const byModel = [];
const liveFeed = [];

app.get("/api/health", (_req, res) => res.json({ ok: true, usageEvents: usageEvents.length }));

app.post("/api/usage/ingest", (req, res) => {
  const event = {
    provider: req.body?.provider || null,
    endpoint: req.body?.endpoint || null,
    model: req.body?.model || null,
    statusCode: Number(req.body?.statusCode ?? 0),
    inputTokens: Number(req.body?.inputTokens ?? 0),
    outputTokens: Number(req.body?.outputTokens ?? 0),
    totalTokens: Number(req.body?.totalTokens ?? 0),
    timestamp: req.body?.timestamp || new Date().toISOString(),
    subscriptionId: req.body?.subscriptionId || null,
    subscriptionName: req.body?.subscriptionName || null,
    requestId: req.body?.requestId || null,
    errorMessage: req.body?.errorMessage || null,
  };

  usageEvents.unshift(event);
  if (usageEvents.length > 1000) usageEvents.length = 1000;

  console.log("[usage.ingest]", JSON.stringify(event));

  res.status(202).json({ ok: true });
});
app.get("/api/usage/daily", (_req, res) => res.json(daily));
app.get("/api/usage/monthly", (_req, res) => res.json(monthly));
app.get("/api/usage/realtime", (_req, res) => res.json(realtime));
app.get("/api/usage/trend", (_req, res) => res.json(trend));
app.get("/api/usage/by-model", (_req, res) => res.json(byModel));
app.get("/api/usage/live-feed", (_req, res) => res.json(liveFeed));

app.get("/api/keys", (_req, res) => res.json(keys));
app.get("/api/keys/:id/key", (req, res) => {
  const key = keys.find((k) => k.id === req.params.id);
  if (!key) return res.status(404).json({ error: "Key not found" });
  res.json({ apiKey: key.apiKey });
});

app.post("/api/keys", (req, res) => {
  const rawId = (req.body?.id || "").trim().toLowerCase();
  const displayName = (req.body?.displayName || "").trim();
  const group = (req.body?.group || "HUMAN").trim().toUpperCase();

  if (!rawId || !displayName) {
    return res.status(400).json({ error: "id and displayName are required" });
  }

  const id = rawId.startsWith("hhx-") ? rawId : `hhx-${rawId}`;
  if (keys.some((k) => k.id === id)) {
    return res.status(409).json({ error: "A key with that subscription ID already exists" });
  }

  const suffix = group === "AGENT" ? " AGENT" : group === "LAB" ? " LAB" : "";
  const item = {
    id,
    displayName: displayName.endsWith(suffix) || suffix === "" ? displayName : `${displayName}${suffix}`,
    state: "active",
    apiKey: `hhx_mock_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
    endpoint: "https://hhx-ai-gateway.azure-api.net/hhx-ai-models/openai/v1"
  };

  keys = [item, ...keys];
  res.status(201).json(item);
});

app.delete("/api/keys/:id", (req, res) => {
  const before = keys.length;
  keys = keys.filter((k) => k.id !== req.params.id);
  if (keys.length === before) return res.status(404).json({ error: "Key not found" });
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`APIM HHX Gateway server listening on http://localhost:${port}`);
});
