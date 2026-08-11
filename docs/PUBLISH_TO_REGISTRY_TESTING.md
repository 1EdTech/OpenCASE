# Publish to Registry (Dry-Run) — Local Testing Guide

How to exercise the **dry-run** publish path: OpenCASE maps a stored CASE framework
to a Registry Assistant request and POSTs it to the `/format` endpoint, which
validates it and returns the CTDL it *would* store. **Nothing is published** and no
CTIDs are persisted — this proves the mapping and surfaces Registry Assistant
validation errors. (Real publish + CTID persistence are a later slice.)

## Prerequisites
- A **sandbox** Registry Assistant API key and your **publishing organization's CTID**
  (`ce-…`), from your Credential Engine sandbox account. See
  https://credreg.net/registry/assistant.
- The `feat/publish-to-registry` branch checked out.

## 1. Configure credentials
Add to your root `.env` (the API key is a secret — never commit it):
```
REGISTRY_ASSISTANT_ENVIRONMENT=sandbox
REGISTRY_ASSISTANT_API_KEY=<your sandbox api key>
REGISTRY_ASSISTANT_ORG_CTID=ce-<your org ctid>
```

## 2. Rebuild the backend
The container runs the compiled `dist`, so the new code needs a build:
```bash
docker-compose up --build opencase
```

## Option A — from the editor (easiest)
1. Sign in and open a **saved** framework (one that's been published to OpenCASE)
   that you **authored or forked**. Imported-but-unforked frameworks are read-only
   and intentionally not publishable.
2. Click the **framework node** to open the side panel, then **Export** →
   **Preview publish to registry…**.
3. In the dialog, choose **sandbox** (default) or production, then **Run dry-run**.
   You'll see whether the Registry Assistant accepted the mapping, any validation
   **Messages**, and the exact request under "Request sent to Registry Assistant".

The button uses your existing editor session — no manual token needed — and appears
only for saved, editable frameworks.

## Option B — via the API (scripting)
`/management` requires a bearer token, and password grants are disabled, so grab the
token the editor is already using: sign in, open DevTools → **Network** → copy the
`Authorization: Bearer <token>` from any `/management` or `/ims` request (tokens are
short-lived). The framework **docId** is its `CFDocument.identifier`; the default
tenant is `system`.

```bash
curl -X POST \
  "http://localhost:3000/management/tenants/system/ims/case/v1p1/CFPackages/<docId>/preview-publish" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Add `?environment=production` (or `-d '{"environment":"production"}'`) to dry-run
against production instead of sandbox.

## What you get back
A `200` with:
- **`request`** — the exact Registry Assistant payload OpenCASE would send:
  `CompetencyFramework` with a freshly minted `CTID`, `Name`, `Publisher` (your org
  CTID) and `HasTopChild`; `Competencies[]` with `CTID`, `CompetencyText`,
  `IsChildOf`, and any `ExactAlignment` / `AlignTo` from your alignment associations.
- **`format`** — the Registry Assistant response: `format.ok` is `true` when the
  mapping validates; `format.body.Messages` lists any problems (e.g. a missing
  `Description` or `Publisher`, which the Registry Assistant requires).

### Common responses
- **503 / 400 "Publishing not configured"** — `REGISTRY_ASSISTANT_API_KEY` or
  `REGISTRY_ASSISTANT_ORG_CTID` is unset; recheck `.env` and that you rebuilt.
- **401** (Option B) — missing/expired bearer token; grab a fresh one.
- **`format.ok: false`** — the mapping reached the Registry Assistant but it rejected
  the content; read `format.body.Messages` for the specifics.
