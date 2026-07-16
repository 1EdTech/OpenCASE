# OpenCASE — Developer Guide

Technical reference for developers working on or integrating with the OpenCASE publishing server.

For a non-technical overview, see the [OpenCASE README](../README.md).

---

## Getting Started

### Install dependencies

```bash
npm install
```

### Run in dev mode

```bash
npm run dev
```

API is available at: http://localhost:8080

#### Health check:

```
GET /health
```

### Build for production

```bash
npm run build
npm start
```

### Using Docker

```bash
docker-compose up --build
```

Mount your CASE data at: `./data:/app/data`

---

## Architecture

### Clean Architecture Layers

```
src/
domain/         # Entities, VOs, domain services
application/    # Use-cases (queries + commands)
infrastructure/ # File persistence, auth, logging, schema validation
interfaces/     # HTTP controllers, Express routes, middleware
main.ts         # Bootstrap + DI container
```

Separation of concerns lets you:

- Swap persistence (file to database)
- Add transport layers (GraphQL, gRPC)
- Extend domain logic without touching controllers

### Architecture Snapshot

```text
Domain
├── CFDocument
├── CFItem
├── CFAssociation
└── CFPackage

Application
├── CreateFramework
└── GetCFPackage

Infrastructure
├── FileFrameworkStore
└── FileCFPackageRepository

Interfaces
├── Admin controllers
└── Public CASE v1.0 / v1.1 controllers
```

Loose coupling means you can replace any layer independently.

---

## Data Layout

Framework data is stored as versioned files on disk:

```
data/
  tenants/
    demo/
      v1p1/
        frameworks/
          doc-123/
            doc-123_v0001.json
            doc-123_v0002.json
        indexes/
          documents.json
          document-versions.json
          items.json
          associations.json
```

Each framework file contains:

```json
{
  "CFDocument": { ... },
  "CFItems": [ ... ],
  "CFAssociations": [ ... ],
  "CFRubrics": [ ... ]
}
```

---

## Authentication & Authorization

### Keycloak OIDC Authentication

OpenCASE delegates authentication to **Keycloak** (external OIDC provider). OpenCASE does not issue tokens itself.

Browser SPAs should use **Authorization Code with PKCE** via Keycloak's OIDC endpoints:

- `GET {issuer}/protocol/openid-connect/auth` - Authorization endpoint
- `POST {issuer}/protocol/openid-connect/token` - Token endpoint
- `GET {issuer}/.well-known/openid-configuration` - OIDC discovery

Where `{issuer}` is your Keycloak realm URL (e.g. `https://YOUR_DOMAIN/realms/opencase`).

For server-to-server use, configure a Keycloak service account with **Client Credentials** grant type.

See the [Backend Integration Guide](FRAMEWORK_EDITOR_BACKEND_INTEGRATION.md) for detailed authentication setup including PKCE flow, token contract, and tenant scoping.

### Scopes / Roles

OpenCASE uses Keycloak client roles to control access:

| Scope | Description | Use Cases |
|-------|-------------|-----------|
| `case.read` | Read-only access to CASE entities | Management list/get frameworks, licenses, definitions |
| `case.write` | Read and write access to CASE entities | Creating/updating/deleting frameworks; CGE search/import proxies |
| `case.owner` | Per-tenant administrator | Manage members, OpenCASE API keys, CGE credentials |
| `case.admin` | System-wide administrator | Create/list tenants (`tenant-system` client) |

**Scope Hierarchy** (enforced in middleware):
- `case.owner` implies `case.write` and `case.read`
- `case.write` implies `case.read`
- `case.admin` is orthogonal (system tenant only; does not imply tenant scopes)

**Member roles** (mapped to client roles via `/management/tenants/{tenantId}/members`):

| Role | Scopes |
|------|--------|
| `viewer` | `case.read` |
| `author` | `case.read`, `case.write` |
| `admin` | `case.read`, `case.write`, `case.owner` |

### JWT Token Claims

Keycloak-issued access tokens are JWTs containing:

- `iss` - Issuer (must match the Keycloak realm URL)
- `aud` / `azp` - Audience / authorized party (must match the tenant client id)
- `tenantId` - Tenant identifier (injected by Keycloak mapper, required for tenant-scoped operations)
- `scope` - Space-separated list of granted scopes (from client roles)
- `org_id` - Optional SSO org claim (must equal `tenantId` for ensure-self); claim name configurable via `SSO_ORG_CLAIM`
- `sub` - Subject (user ID for authorization_code flow, client ID for client_credentials)

### Tenancy model

OpenCASE uses a **single Keycloak realm** with **one OAuth client per tenant** (`tenant-{tenantId}`). JWT `tenantId` must match the URL `:tenantId` on all management routes.

---

## Configuration

### Environment variables

| Variable | Description | Default |
|-|-|-|
| PORT | HTTP port | 8080 |
| CASE_DATA_DIR | Root of data directory | ./data |
| JWT_PUBLIC_KEY | RSA public key for validation | none |
| JWT_ISSUER | JWT issuer | example-issuer |
| JWT_AUDIENCE | JWT audience | example-audience |

---

## API Overview

### Public CASE Provider (/ims/case/...)

Read-only. Follows the official spec.

```
GET /ims/case/v1p1/CFPackages/{id}
GET /ims/case/v1p1/CFDocuments
```

### CASE Entity Resources

- **CFDocuments**
- **CFItems**
- **CFAssociations**
- **CFRubrics**
- **CFPackages**
- Supports **fields filtering**, **pagination**, **sorting**, and **metadata filtering**
- Fully compatible with **CASE 1.0** and **CASE 1.1** REST bindings

### Management / Authoring API

Allows creation and updating of frameworks:

- `POST` /management/tenants/:tenantId/ims/case/v1p1/CFPackages
- `PUT`  /management/tenants/:tenantId/ims/case/v1p1/CFDocuments/:id
- `PUT`  /management/tenants/:tenantId/ims/case/v1p1/CFItems/:id
- `PUT`  /management/tenants/:tenantId/ims/case/v1p1/CFAssociations/:id

Each update generates a **new immutable version** on disk.

### Management API (/management/...)

The Management API provides extended functionality beyond the CASE standard. These endpoints allow you to:

- **Update and Delete** CASE entities (CFDocuments, CFItems, CFAssociations)
- **Manage Tenants** (create, list)
- **Manage User Accounts** (create, update, delete, list, manage memberships)
- **Manage OAuth Clients** (create, delete, list)
- **List Frameworks** for a tenant

All management endpoints require authentication and are scoped to the authenticated tenant.

#### CASE Entity Management

**Update CFDocument:**
```bash
PUT /management/tenants/{tenantId}/CFDocuments/{id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "CFDocument": { /* Updated CFDocument */ }
}
```

**Delete CFDocument:**
```bash
DELETE /management/tenants/{tenantId}/CFDocuments/{id}
Authorization: Bearer {access_token}
```

Similar endpoints exist for:
- `PUT /management/tenants/{tenantId}/CFItems/{id}`
- `DELETE /management/tenants/{tenantId}/CFItems/{id}`
- `PUT /management/tenants/{tenantId}/CFAssociations/{id}`
- `DELETE /management/tenants/{tenantId}/CFAssociations/{id}`

**List Frameworks:**
```bash
GET /management/tenants/{tenantId}/frameworks?caseVersion=1.1
Authorization: Bearer {access_token}
```

#### Tenant Management

**Required Scope:** `case.admin`

**List All Tenants:**
```bash
GET /management/tenants
Authorization: Bearer {access_token}
```

**Create a New Tenant:**
```bash
POST /management/tenants
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "tenantId": "new-tenant-id"
}
```

**Response:**
```json
{
  "status": "created",
  "tenantId": "new-tenant-id",
  "adminAccount": {
    "email": "admin@new-tenant-id.local",
    "password": "auto-generated-password"
  }
}
```

When a tenant is created, an admin account is automatically created with:
- Email: `admin@{tenantId}.local`
- Auto-generated password (returned in response)
- Role: `admin`
- Scopes: `case.read`, `case.write`, `case.owner`

#### Member Management (Keycloak)

**Required Scope:** `case.owner`

Members are Keycloak users with client roles on `tenant-{tenantId}`.

**List members:**
```bash
GET /management/tenants/{tenantId}/members
Authorization: Bearer {access_token}
```

**Add member:**
```bash
POST /management/tenants/{tenantId}/members
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "author"
}
```

Roles: `viewer` | `author` | `admin` (maps to scopes as above).

**Update member role:**
```bash
PATCH /management/tenants/{tenantId}/members/{userId}
Authorization: Bearer {access_token}
Content-Type: application/json

{ "role": "admin" }
```

**Remove member** (removes this tenant’s client roles only):
```bash
DELETE /management/tenants/{tenantId}/members/{userId}
Authorization: Bearer {access_token}
```

**SSO ensure-self** (no `case.*` scope; requires access-token `org_id` === `tenantId`):
```bash
POST /management/tenants/{tenantId}/members/ensure-self
Authorization: Bearer {access_token}
```

Assigns default `author` roles on first login when the org claim matches. Re-authenticate afterward so the JWT includes the new scopes.

#### OpenCASE API Keys

**Required Scope:** `case.owner`

```bash
GET/POST /management/tenants/{tenantId}/api-keys
DELETE /management/tenants/{tenantId}/api-keys/{keyId}
```

Each key is a Keycloak confidential client with `client_credentials` and `case.read`.

#### CASE Global (CGE) credentials and proxies

**Configure credentials** (`case.owner`):
```bash
GET/PUT/DELETE /management/tenants/{tenantId}/cge/credentials
POST /management/tenants/{tenantId}/cge/credentials/test
```

PUT body: `{ "clientId": "...", "clientSecret": "..." }`. Secrets are encrypted at rest (`CGE_CREDENTIALS_ENCRYPTION_KEY`). GET never returns the secret.

**Use CGE** (`case.write`) — OpenCASE backend mints org tokens server-side:
```bash
GET  /management/tenants/{tenantId}/cge/frameworks
GET  /management/tenants/{tenantId}/cge/frameworks/{frameworkId}
POST /management/tenants/{tenantId}/cge/subscriptions
POST /management/tenants/{tenantId}/cge/import
```

Import body example: `{ "frameworkId": "...", "sourceUri": "https://publisher/.../CFPackages/...", "subscribe": true }`.

Env: `CGE_TOKEN_URL`, `CGE_API_BASE_URL`, `CGE_CREDENTIALS_ENCRYPTION_KEY`, `SSO_ORG_CLAIM` (default `org_id`).

---

## Roadmap

- Full implementation of all CASE endpoints
- Automated index regeneration tool
- JSON Schema validation for admin payloads
- Optional read/write locking for concurrent edits
- Plugin system for alternate persistence engines (Mongo, Neo4j, S3)
- Certification test suite automation

---

## Contributing

Issues and PRs welcome — this is a reference implementation, so clarity over cleverness. If adding persistence engines or admin operations, follow the Clean Architecture boundaries.
