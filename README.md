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


Authentication

Both public and admin APIs require a valid JWT with:
	•	iss = configured issuer
	•	aud = configured audience
	•	Recommended claim: tenantId

Env variables:

- JWT_PUBLIC_KEY=
- JWT_ISSUER=
- JWT_AUDIENCE=


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
