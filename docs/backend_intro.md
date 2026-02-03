# OpenCASE Backend Integration Guide (for a Framework Editor)

This document is intended as **integration context** for a separate “framework editor / visual flow editor” that:

- edits frameworks locally
- converts them to **1EdTech CASE** format
- uses **OpenCASE** as the backend for persistence + serving via the CASE Provider API

---

## What this project provides

OpenCASE exposes two relevant HTTP surfaces:

- **External OIDC provider (Keycloak)** for login + tokens (OpenCASE no longer issues tokens)
- **CASE Provider API (read-only, spec-aligned)**: `/ims/case/v1p1/*` (and v1p0 in the project, but v1p1 is the primary path in `src/interfaces/http/server.ts`)
- **Non-standard Management API (write operations + tenant admin)**: `/management/*` (create/import CFPackage bundles + update/delete CASE entities + tenant management)

All framework data is persisted **to disk** under `data/tenants/<tenantId>/v1p1/...` (and/or `v1p0`).

---

## Base URL and discovery

- **Default server base URL**: `http://localhost:8080`
- **OpenAPI discovery (no auth)**:
  - `GET /ims/case/v1p1/discovery/imscasev1p1_openapi3_v1p0.json`
- **OIDC discovery (Keycloak)**:
  - `GET http://localhost:8081/realms/opencase/.well-known/openid-configuration`

---

## Authentication requirements (what your editor must do)

### Summary

- **All** routes under:
  - `/ims/case/*`
  - `/management/*`
  require an `Authorization: Bearer <JWT>` header.
- OpenCASE does **not** provide `/oauth/*` token issuance in this deployment; tokens come from **Keycloak**.

### Browser SPA recommendation: Keycloak OIDC (Authorization Code + PKCE)

Because your editor runs **in the browser** (React + react-flow), you should **not** embed a `client_secret` in the frontend. Use `authorization_code` with **PKCE** so the SPA can obtain a JWT access token without a secret.

OpenCASE expects a **Keycloak-issued** access token. Your SPA should use Keycloak’s OIDC endpoints:

- `GET {issuer}/protocol/openid-connect/auth` (authorization)
- `POST {issuer}/protocol/openid-connect/token` (token exchange)

Where `{issuer}` is typically: `http://localhost:8081/realms/opencase`.

#### Client-per-tenant model (how tenant switching works)

This deployment uses **client-per-tenant** in Keycloak:

- Tenant client id is: `tenant-<tenantId>` (prefix configurable by `OIDC_CLIENT_ID_PREFIX`)
- When the user switches tenants, the SPA should **re-auth / refresh** using the **other tenant client_id**, so roles can vary per tenant.

#### Token contract (claims OpenCASE requires)

OpenCASE validates:

- **issuer**: must match `OIDC_ISSUER_URL`
- **signature**: via Keycloak JWKS (`kid` rotation supported)
- **tenantId**: must exist as a claim (Keycloak mapper injects it per tenant client)
- **aud/azp**: must match the expected client id (`tenant-<tenantId>`)

OpenCASE uses `scope` for authorization checks on some management routes. The provisioner configures Keycloak to emit `scope` from client roles.

#### Important: OIDC `scope=` parameter vs `case.*` roles

In Keycloak/OIDC, the authorization request `scope` parameter is for **OIDC client scopes** (typically `openid profile email offline_access`), not your application’s authorization roles.

- Do **not** request `scope=case.admin` (or `case.read`, `case.write`, etc.) in the PKCE/OIDC request — Keycloak will return `invalid_scope` unless you created a Keycloak client-scope with that name.
- Instead, ensure the user has the **client role** `case.admin` on the tenant client (e.g. `tenant-system`), which will appear in the token under `resource_access[clientId].roles` and/or in the token’s `scope` claim (depending on your mappers).

#### Step 1: Generate PKCE values in the browser

- `code_verifier`: random high-entropy string
- `code_challenge`: base64url(SHA256(code_verifier)) for `S256`

Store the `code_verifier` (and `state`) in session storage until callback.

#### Step 2: Start authorization (Keycloak)

Redirect the browser to Keycloak’s authorization endpoint with:

- `client_id=tenant-<tenantId>`
- `response_type=code`
- `redirect_uri=<your app callback>`
- `code_challenge=<pkce challenge>`
- `code_challenge_method=S256`
 - optional `scope=openid profile email` (recommended); omit any `case.*` values here

#### Step 3: Handle the redirect on your SPA callback route

Your `redirect_uri` receives:

- `?code=...`
- `&state=...` (if supplied)

#### Step 4: Exchange code for token (Keycloak)

`POST {issuer}/protocol/openid-connect/token` with:

- `grant_type=authorization_code`
- `client_id=tenant-<tenantId>`
- `code=...`
- `redirect_uri=...`
- `code_verifier=...`

The response includes:

- `access_token` (JWT)
- `token_type=Bearer`
- `expires_in`
- optionally `refresh_token` (if refresh-token support is enabled)

#### Step 5: Call OpenCASE APIs with the token

Add:

- `Authorization: Bearer <access_token>`

to all `/ims/case/*` and `/management/*` calls.

### Alternative (recommended for production): BFF / token broker

If you don’t want your SPA to ever handle OpenCASE tokens (or you want to avoid cross-origin redirect edge cases), put a small **backend-for-frontend (BFF)** in front:

- SPA authenticates with your IdP (or a cookie session)
- BFF calls OpenCASE using `client_credentials` (keeps `client_secret` on the server)
- BFF proxies `/ims/case/*` + the write operations needed by the editor

This also gives you a single place to enforce editor-specific authorization rules.

### Dev/Postman note (Keycloak)

For Postman, obtain a Keycloak token for the tenant client (e.g. `tenant-demo`) using the standard OIDC endpoints. See `POSTMAN_TESTING_GUIDE.md` for a concrete request template.

### JWT requirements (what must be in the token)

The API uses a JWT verifier that requires:

- **RS256**
- **issuer** matches configured issuer
- **audience** matches configured audience

Tokens issued by Keycloak (in this deployment) include:

- `tenantId` (used to scope which tenant’s frameworks you can access)
- `scope` (space-separated OAuth scopes, used by some management routes)
- `aud` (audience)

### Tenant scoping behavior

- For **management routes** (e.g. `/management/tenants/:tenantId/...`), controllers enforce **tenant mismatch protection**: the `tenantId` in the token must match the `:tenantId` in the URL.
- For **CASE read routes** (`/ims/case/v1p1/...`), the tenant is derived from the token’s `tenantId` (with a fallback default of `demo` if missing).

### Scopes (what’s enforced in code)

Scopes exist and are returned in tokens, and **some** endpoints enforce them:

- `case.admin` is enforced for:
  - `GET /management/tenants`
  - `POST /management/tenants`
- Other management endpoints are currently protected by:
  - a valid JWT
  - tenant mismatch protection (token tenantId must match URL tenantId)

As of the current code, the write endpoints for updating CASE entities:

- `PUT/DELETE /management/tenants/:tenantId/ims/case/v1p1/CFDocuments/:id` (or `v1p0`)
- `PUT/DELETE /management/tenants/:tenantId/ims/case/v1p1/CFItems/:id` (or `v1p0`)
- `PUT/DELETE /management/tenants/:tenantId/ims/case/v1p1/CFAssociations/:id` (or `v1p0`)

do **not** additionally require `case.write` at the router level (they still require a valid JWT and correct tenant).

---

## How to list and consume frameworks (read side)

### Option A (recommended for editors): list CFPackages via Management API

**List CFPackages for a tenant (non-standard)**

- `GET /management/tenants/{tenantId}/CFPackages?caseVersion=1.1`
- Returns metadata including `sourcedId` (document id) + `caseVersion`.

Use this to drive your editor’s “open framework” picker.

### Option B (CASE standard listing): list CFDocuments

**List CFDocuments**

- `GET /ims/case/v1p1/CFDocuments`
- This is the CASE provider listing endpoint (read-only).

### Load a framework for editing/viewing

If your editor wants the entire framework in one request (document + items + associations + rubrics + definitions):

**Get CFPackage (complete bundle)**

- `GET /ims/case/v1p1/CFPackages/{documentSourcedId}`

This is usually the simplest “open framework” call for an editor UI.

---

## How to create or edit frameworks (write side)

### Key design point: versioned “bundle writes”

OpenCASE stores each framework as **versioned files on disk**. Each write produces a new version file like:

`data/tenants/<tenantId>/v1p1/frameworks/<docId>/<docId>_v0001.json`

This means you can implement editing in two main ways:

- **Bundle publish approach (best for “save/publish” from an editor)**:
  - send a full bundle (document + items + associations + rubrics + definitions)
  - OpenCASE writes a **new immutable version**
- **Entity update approach (best for small edits to existing IDs)**:
  - update a single CFDocument / CFItem / CFAssociation
  - OpenCASE rewrites the framework bundle as a new version, but only changes the targeted entity

### Create / publish a full framework bundle (supports adding NEW items/associations)

**Endpoint**

- `POST /management/tenants/{tenantId}/ims/case/v1p1/CFPackages`
  - (or v1p0): `POST /management/tenants/{tenantId}/ims/case/v1p0/CFPackages`

**Body shape expected by OpenCASE**

```json
{
  "document": { /* CASE CFDocument JSON */ },
  "items": [ /* CASE CFItem JSON[] */ ],
  "associations": [ /* CASE CFAssociation JSON[] */ ],
  "rubrics": [ /* CFRubric[] (passed through) */ ],
  "definitions": { /* CFDefinitions (optional, passed through) */ }
}
```

**Important**

- The CFDocument’s `sourcedId` (or `identifier`) determines the framework id (`docId`) used in:
  - `/ims/case/v1p1/CFDocuments/{docId}`
  - `/ims/case/v1p1/CFPackages/{docId}`
- Calling this endpoint again with the same `document.sourcedId` will create **another** version on disk (i.e., “publish new revision”).
- **Schema note**: OpenCASE validates against the CASE CFPackage schema. Minimal requirements that often trip up test payloads:
  - `document.creator` is required
  - every `sourcedId` must be a **UUID**
  - each CFItem requires `uri`, `lastChangeDateTime`, and a `CFDocumentURI` link object
  - each CFAssociation requires `uri`, `lastChangeDateTime`, plus `originNodeURI` and `destinationNodeURI` link objects (not plain `originNode` / `destinationNode` strings)

### Import a framework bundle from a remote endpoint (optional)

**Endpoint**

- `POST /management/tenants/{tenantId}/ims/case/v1p1/CFPackages/import`
  - (or v1p0): `POST /management/tenants/{tenantId}/ims/case/v1p0/CFPackages/import`

**Body**

```json
{
  "endpointUrl": "https://example.org/ims/case/v1p1/CFPackages/<docId>",
  "accessToken": "optional bearer token to fetch the remote package",
  "validateSchema": false,
  "schemaName": "optional schema name override"
}
```

Returns `{ docId, version }` on success.

### Update existing entities (only works for existing IDs)

These are non-standard endpoints meant for editor-style updates.

**Update CFDocument**

- `PUT /management/tenants/{tenantId}/ims/case/v1p1/CFDocuments/{docId}`
  - (or v1p0): `PUT /management/tenants/{tenantId}/ims/case/v1p0/CFDocuments/{docId}`
- Body: **raw CFDocument JSON** (not wrapped)

**Update CFItem**

- `PUT /management/tenants/{tenantId}/ims/case/v1p1/CFItems/{itemId}`
  - (or v1p0): `PUT /management/tenants/{tenantId}/ims/case/v1p0/CFItems/{itemId}`
- Body: **raw CFItem JSON**

**Update CFAssociation**

- `PUT /management/tenants/{tenantId}/ims/case/v1p1/CFAssociations/{associationId}`
  - (or v1p0): `PUT /management/tenants/{tenantId}/ims/case/v1p0/CFAssociations/{associationId}`
- Body: **raw CFAssociation JSON**

**Delete**

- `DELETE /management/tenants/{tenantId}/ims/case/v1p1/CFDocuments/{docId}`
- `DELETE /management/tenants/{tenantId}/ims/case/v1p1/CFItems/{itemId}`
- `DELETE /management/tenants/{tenantId}/ims/case/v1p1/CFAssociations/{associationId}`
- `DELETE /management/tenants/{tenantId}/ims/case/v1p1/CFPackages/{docId}` (delete entire framework bundle)

**Note on CASE version selection for write operations**

- For **mutation** endpoints (POST/PUT/DELETE), the CASE version is explicit in the path (`.../ims/case/v1p0/...` or `.../ims/case/v1p1/...`).
- For **GET list** endpoints (e.g. `GET /management/tenants/{tenantId}/CFPackages`), `caseVersion=1.0|1.1` remains an optional query filter.

**Note on “creating” new items/associations**

There is no dedicated `POST /CFItems` or `POST /CFAssociations` management endpoint in the current server. To add new items/associations, use the **bundle publish** endpoint:

- `POST /management/tenants/{tenantId}/ims/case/v1p1/CFPackages`

### Recommended editor workflow

- **Open**:
  - `GET /management/tenants/{tenantId}/CFPackages?caseVersion=1.1`
  - `GET /ims/case/v1p1/CFPackages/{docId}`
- **Edit in UI** (local state)
- **Save**:
  - for “publish revision / adds new nodes/edges”: `POST /management/tenants/{tenantId}/ims/case/v1p1/CFPackages` with full bundle
  - for “edit an existing node/edge”: `PUT /management/tenants/{tenantId}/ims/case/v1p1/CFItems/{id}` / `.../CFAssociations/{id}` / `.../CFDocuments/{id}`
- **Refresh/canonicalize**:
  - re-fetch `GET /ims/case/v1p1/CFPackages/{docId}` after saving so the UI state matches persisted data

---

## Data model notes (what your editor should map to)

- **Framework**: CASE `CFDocument` (id = `sourcedId`)
- **Nodes**: CASE `CFItem` (id = `sourcedId`)
- **Edges**: CASE `CFAssociation` (id = `sourcedId`)
  - edges point at items via `originNodeURI.identifier` and `destinationNodeURI.identifier`

---

## Operational notes

- Persistence is file-based; if you want isolated environments, use separate `CASE_DATA_DIR` values or separate tenantIds.
- CORS is permissive in `src/interfaces/http/server.ts` (useful for local dev from a separate editor app).

---

## Email-first sign-in (tenant discovery)

### Goal
Remove the explicit tenant picker in the SPA. Instead, implement a 2-step login:

1) user enters email
2) SPA calls OpenCASE **public tenant lookup** endpoint to discover `tenantId`
3) SPA starts Keycloak OIDC redirect using `client_id = tenant-<tenantId>` (or whatever prefix you configured)

This preserves the client-per-tenant Keycloak model while improving UX.

### Public lookup endpoint

- **Endpoint (no auth)**: `GET /public/tenant-lookup?email=<email>`
- **Anti-enumeration behavior**:
  - Always responds with **`202 Accepted`**
  - Response body **may** include `{ "tenantId": "..." }` if the email maps to a tenant
  - If no mapping exists (or lookup fails), response omits `tenantId`

### Manual flow (SPA)
Start at Home → enter email → click Continue → call lookup → if `tenantId` returned, redirect to Keycloak → return to app → store token → OpenCASE calls succeed.
