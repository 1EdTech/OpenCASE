# OpenCASE – Reference CASE 1.0 / 1.1 Provider & Management API

OpenCASE is a **reference implementation** of a multi-tenant  
**1EdTech CASE (Competencies & Academic Standards Exchange) Provider**, supporting:

- **CASE 1.0 and CASE 1.1**
- **Full service-discovery** required for certification
- **Read-only public provider API** (`/ims/case/v1p0/*`, `/ims/case/v1p1/*`)
- **Versioned, file-based persistence** (no database required)
- **Admin/authoring REST API** for creating and managing frameworks
- **DDD + Clean Architecture** folder layout
- **Extensible** infrastructure for alternate storage engines (Mongo, Neo4j, S3, etc.)

The goal is to provide a transparent, standards-aligned baseline provider that others can learn from, fork, or embed.

This project is not to be confused with the CASE Nexus project which acts as Network of Networks for CASE.  Contact x1EdTech for more details


## Features

### Full CASE Provider (Spec-Compliant)

- **CFDocuments**
- **CFItems**
- **CFAssociations**
- **CFRubrics**
- **CFPackages**
- Supports **fields filtering**, **pagination**, **sorting**, and **metadata filtering**
- Fully compatible with **CASE 1.0** and **CASE 1.1** REST bindings

### Admin / Authoring API (Internal)

Allows creation and updating of frameworks:

- `POST` /admin/tenants/:tenantId/frameworks
- `PUT`  /admin/tenants/:tenantId/frameworks/:docId

Each update generates a **new immutable version** on disk.

### Versioned File-Based Persistence

Data is stored as:

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

Indexes load into small in-memory maps. Framework bundle files stay on disk.

This allows:

- Fast boot
- Git-friendly diffs
- Zero external dependencies
- Clear history of changes

### Clean Architecture

src/
domain/         # Entities, VOs, domain services
application/    # Use-cases (queries + commands)
infrastructure/ # File persistence, auth, logging, schema validation
interfaces/     # HTTP controllers, Express routes, middleware
main.ts         # Bootstrap + DI container

Separation of concerns lets you:

- Swap persistence (file → database)
- Add transport layers (GraphQL, gRPC)
- Extend domain logic without touching controllers

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run in dev mode

``` bash
npm run dev
``` 

API is available at: http://localhost:8080

#### Health check:

```
GET /health
```

### 3. Build for production

```bash
npm run build
npm start
```

### 4. Using Docker

```bash
docker-compose up --build
```

Mount your CASE data at:

./data:/app/data

---
## Data Layout


Example:

```bash
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

Each framework file (doc-123_v0002.json) contains:

```json
{
  "document": { ... },
  "items": [ ... ],
  "associations": [ ... ],
  "rubrics": [ ... ]
}
```


## Authentication & Authorization

### OAuth2 Authentication

OpenCASE supports OAuth2 authentication with multiple grant types:

- **Client Credentials** (`client_credentials`): For server-to-server authentication
- **Authorization Code with PKCE** (`authorization_code`): For user-facing applications (e.g., React apps)
- **Refresh Token** (`refresh_token`): For obtaining new access tokens

#### OAuth2 Endpoints

- `GET /oauth/authorize` - Authorization endpoint (for authorization_code flow)
- `POST /oauth/token` - Token endpoint (supports all grant types)
- `POST /oauth/revoke` - Token revocation endpoint
- `GET /.well-known/oauth-authorization-server` - OAuth2 discovery endpoint

#### Obtaining an Access Token

**Client Credentials Flow:**
```bash
curl -X POST http://localhost:8080/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "scope=case.read case.write"
```

**Authorization Code Flow (with PKCE):**
1. Generate code verifier and challenge
2. Redirect user to `/oauth/authorize?response_type=code&client_id=...&code_challenge=...&code_challenge_method=S256`
3. User authenticates and authorizes
4. Exchange authorization code for tokens at `/oauth/token`

### Scopes

OpenCASE uses OAuth2 scopes to control access to different operations:

| Scope | Description | Use Cases |
|-------|-------------|-----------|
| `case.read` | Read-only access to CASE entities | Public API access, viewing frameworks |
| `case.write` | Read and write access to CASE entities | Creating/updating frameworks, items, associations |
| `case.owner` | Per-tenant administrator | Manage accounts, OAuth clients, and tenant data within a specific tenant |
| `case.admin` | System-wide administrator | Create tenants, manage OAuth clients across all tenants |

**Scope Hierarchy:**
- `case.admin` - Highest privilege (system-wide)
- `case.owner` - Tenant-specific administration
- `case.write` - Includes `case.read` permissions
- `case.read` - Basic read access

### JWT Token Claims

Access tokens are JWTs containing:

- `iss` - Issuer (must match configured `JWT_ISSUER`)
- `aud` - Audience (must match configured `JWT_AUDIENCE`)
- `tenantId` - Tenant identifier (required for tenant-scoped operations)
- `scope` - Space-separated list of granted scopes
- `sub` - Subject (user ID for authorization_code flow, client ID for client_credentials)

### Environment Variables

- `JWT_PUBLIC_KEY` - RSA public key for JWT validation (PEM format)
- `JWT_ISSUER` - Expected JWT issuer (default: `example-issuer`)
- `JWT_AUDIENCE` - Expected JWT audience (default: `example-audience`)


## Configuration

### Environment variables:

| Variable |	Description| 	Default |
|-|-|-|
|PORT |	HTTP port	| 8080 |
|CASE_DATA_DIR	| Root of data directory |	./data
|JWT_PUBLIC_KEY	| RSA public key for validation	| none
|JWT_ISSUER	| JWT issuer |	example-issuer
|JWT_AUDIENCE |	JWT audience |	example-audience



## API Overview

### Public CASE Provider (/ims/case/...)

#### Read-only. Follows the official spec.

Example:

GET /ims/case/v1p1/CFPackages/{id}
GET /ims/case/v1p1/CFDocuments

#### Admin API (/admin/...)

Used to create/update frameworks.

##### Create a framework

`POST /admin/tenants/{tenantId}/frameworks`

###### Body:

```json
{
  "document": { /* CASE CFDocument */ },
  "items": [ /* CFItem[] */ ],
  "associations": [ /* CFAssociation[] */ ],
  "rubrics": [ /* CFRubric[] */ ]
}
```
Creates a new versioned bundle on disk.

### Management API (/management/...)

The Management API provides extended functionality beyond the CASE standard specification. These endpoints allow you to:

- **Update and Delete** CASE entities (CFDocuments, CFItems, CFAssociations)
- **Manage Tenants** (create, list)
- **Manage User Accounts** (create, update, delete, list, manage memberships)
- **Manage OAuth Clients** (create, delete, list)
- **List Frameworks** for a tenant

All management endpoints require authentication and are scoped to the authenticated tenant. Different endpoints require different scopes as detailed below.

#### CASE Entity Management

These endpoints allow updating and deleting CASE entities. They require authentication and are scoped to the authenticated tenant.

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

These endpoints allow system administrators to create and list tenants.

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

#### Account Management

**Required Scope:** `case.owner`

These endpoints allow tenant administrators to manage user accounts within their tenant.

**Create Account:**
```bash
POST /management/tenants/{tenantId}/accounts
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",  // Optional if autoGeneratePassword is true
  "role": "user",                 // "admin", "user", or "viewer"
  "autoGeneratePassword": false
}
```

**Roles and Default Scopes:**
- `admin` → `case.read`, `case.write`, `case.owner`
- `user` → `case.read`, `case.write`
- `viewer` → `case.read`

**List Accounts:**
```bash
GET /management/tenants/{tenantId}/accounts
Authorization: Bearer {access_token}
```

**Update Account:**
```bash
PUT /management/tenants/{tenantId}/accounts/{accountId}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "email": "newemail@example.com",  // Optional
  "password": "new-password"        // Optional
}
```

**Delete Account:**
```bash
DELETE /management/tenants/{tenantId}/accounts/{accountId}
Authorization: Bearer {access_token}
```

**Add Tenant Membership** (allow account to access multiple tenants):
```bash
POST /management/tenants/{tenantId}/accounts/{accountId}/memberships
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "tenantId": "other-tenant-id",
  "role": "user"
}
```

**Remove Tenant Membership:**
```bash
DELETE /management/tenants/{tenantId}/accounts/{accountId}/memberships/{targetTenantId}
Authorization: Bearer {access_token}
```

#### OAuth Client Management

**Required Scope:** `case.owner` or `case.admin`

These endpoints allow administrators to manage OAuth clients for a tenant.

**Create OAuth Client:**
```bash
POST /management/tenants/{tenantId}/clients
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "clientId": "optional-client-id",      // Optional, auto-generated if not provided
  "clientSecret": "optional-secret",     // Optional if autoGenerateSecret is true
  "grantTypes": ["client_credentials", "authorization_code"],
  "scopes": ["case.read", "case.write"], // Optional
  "active": true,                         // Optional, defaults to true
  "autoGenerateSecret": false            // Optional, defaults to false
}
```

**Response:**
```json
{
  "status": "created",
  "client": {
    "clientId": "generated-client-id",
    "clientSecret": "generated-secret",  // Only shown on creation
    "tenantId": "tenant-id",
    "grantTypes": ["client_credentials"],
    "scopes": ["case.read", "case.write"],
    "active": true
  }
}
```

**List OAuth Clients:**
```bash
GET /management/tenants/{tenantId}/clients
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "clients": [
    {
      "clientId": "client-1",
      "grantTypes": ["client_credentials"],
      "scopes": ["case.read"],
      "active": true
    }
  ],
  "total": 1
}
```

**Delete OAuth Client:**
```bash
DELETE /management/tenants/{tenantId}/clients/{clientId}
Authorization: Bearer {access_token}
```



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


### Roadmap (TODO)
- Full implementation of all CASE endpoints
- Automated index regeneration tool
- JSON Schema validation for admin payloads
- Optional read/write locking for concurrent edits
- Plugin system for alternate persistence engines (Mongo, Neo4j, S3)
- Certification test suite automation


### Contributing

Issues and PRs welcome—this is a reference implementation, so clarity > cleverness.
If adding persistence engines or admin operations, follow the Clean Architecture boundaries.
