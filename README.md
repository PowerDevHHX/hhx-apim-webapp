# hhx-apim-webapp

This is a webapp for the APIM within Azure, because Microsoft Foundry effectively gives you one shared key path and not the kind of per-user/per-model tracking we want. This repo is the webapp side of that setup: APIM forwards model traffic, and this app will ingest metrics, surface dashboards, and later handle admin operations.

## What exists now
- React + Vite frontend
- Express backend
- Metrics ingestion groundwork at `POST /api/usage/ingest`
- Dashboard shell
- API key management shell
- Anthropic APIM policy draft under `Policies/Anthropic-Messages.txt`

## Run

```bash
npm install
npm run install:all
npm run start
```

- Client: http://localhost:7173
- Server: http://localhost:7001

## Current focus
- Wire Anthropic metrics from APIM into this app
- Then add OpenAI metrics
- Then build out API key / user CRUD
