# OpenCASE — Publishing Server

OpenCASE is a standards-compliant publishing server for competency frameworks. It implements the [1EdTech CASE specification](https://www.1edtech.org/activity/case) (versions 1.0 and 1.1), allowing learning platforms, assessment tools, and credential systems to discover and consume your frameworks automatically.

The server is designed as a reference implementation — transparent, standards-aligned, and ready to be embedded, extended, or deployed as-is.


---

## What it does

- **Publishes frameworks** through the official CASE Provider API, fully compatible with the 1EdTech certification requirements
- **Manages the full lifecycle** of competency frameworks — create, update, version, and delete documents, items, associations, and rubrics
- **Isolates tenants** so that each organisation operates in its own workspace with its own users, data, and access controls
- **Manages user accounts** with role-based access — viewers can read, authors can edit, and administrators can manage the tenant
- **Preserves version history** — every change creates a new immutable version, providing a complete audit trail

## Standards compliance

OpenCASE supports both CASE 1.0 and CASE 1.1, including the full set of standard resources: documents, items, associations, rubrics, and packages. The API supports field filtering, pagination, sorting, and metadata filtering as defined by the specification. Service discovery endpoints are included, meeting the requirements for 1EdTech CASE Provider certification.

## Security model

Each tenant is an isolated workspace. Users sign in through Keycloak, which handles identity, single sign-on, and token issuance. OpenCASE enforces tenant boundaries — a user's access token determines which tenant's data they can see and what they can do with it.

Access is controlled through four levels:

| Level | Permissions |
|-------|-------------|
| **Viewer** | Read-only access to published frameworks |
| **Author** | Create and edit frameworks within a tenant |
| **Tenant Administrator** | Manage users, accounts, and client credentials for a tenant |
| **System Administrator** | Create new tenants and manage the platform |

## Data management

Framework data is stored as versioned files rather than in a traditional database. This means zero external dependencies for storage, human-readable data that works naturally with version control, and a clear history of every change. The storage layer is designed to be replaceable — alternative backends can be added without changing the rest of the platform.

---

## Further reading

| Guide | Description |
|-------|-------------|
| [Developer Guide](docs/DEVELOPER.md) | Technical setup, architecture, API endpoints, and configuration |
| [Backend Integration Guide](docs/FRAMEWORK_EDITOR_BACKEND_INTEGRATION.md) | Connecting an editor or external application to the API |
| [API Endpoint Reference](FRAMEWORK_MANAGEMENT_GUIDE.md) | Complete endpoint reference for building integrations |
| [Data Model](docs/DataModel.md) | Official CASE v1.1 data model specification |
| [REST Bindings](docs/RESTBindings.md) | Official CASE v1.1 REST binding specification |
| [Licensing](docs/Licensing.md) | Framework-level licensing and public access controls |
