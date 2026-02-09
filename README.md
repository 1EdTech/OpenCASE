# OpenCASE Monorepo

A monorepo containing the full CASE (Competencies & Academic Standards Exchange) development stack:

- **OpenCASE** (`apps/opencase`) - Reference implementation of a 1EdTech CASE Provider API
- **Editor** (`apps/editor`) - Visual canvas-based framework editor using React Flow

## Quick Start

Start all services with a single command:

```bash
docker-compose up --build
```

Access the application at: **http://localhost:3000**

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser → :3000                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      Traefik                                │
│                   (Reverse Proxy)                           │
├─────────────────────────────────────────────────────────────┤
│  /                    → Editor (React SPA)                  │
│  /ims/*, /management/* → OpenCASE (API)                     │
│  /realms/*, /admin/*  → Keycloak (Auth)                     │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │  Editor   │   │ OpenCASE  │   │ Keycloak  │
    │  (Vite)   │   │ (Express) │   │  (OIDC)   │
    └───────────┘   └───────────┘   └───────────┘
```

## Services

| Service | Internal Port | Description |
|---------|---------------|-------------|
| Traefik | 3000 | Reverse proxy (main entry point) |
| Traefik Dashboard | 8080 | Traefik admin UI |
| Editor | 5173 | React frontend with hot-reload |
| OpenCASE | 8080 | CASE API backend |
| Keycloak | 8080 | OIDC identity provider |

## URLs

| URL | What |
|-----|------|
| http://localhost:3000 | Editor UI |
| http://localhost:3000/ims/case/v1p1/CFDocuments | CASE API |
| http://localhost:3000/health | API health check |
| http://localhost:3000/admin/ | Keycloak Admin Console |
| http://localhost:8080 | Traefik Dashboard |

## Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Keycloak Admin | admin | admin |
| System Admin | system-admin@local | admin |

## Development

### Dev Mode (Hot Reload for All Apps)

For active development with hot-reload on both Editor and OpenCASE:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This enables:
- **Editor**: Vite HMR - edit `apps/editor/src/*` → instant reload
- **OpenCASE**: ts-node-dev - edit `apps/opencase/src/*` → auto-restart

First time or after changing dependencies:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Production Mode

For production-like builds (no hot-reload):

```bash
docker-compose up --build
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f editor
docker-compose logs -f opencase
docker-compose logs -f keycloak
```

### Rebuilding

```bash
# Rebuild all services
docker-compose up --build

# Rebuild specific service
docker-compose up --build opencase
```

### Stopping

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Routing

Traefik routes requests based on path:

| Path Pattern | Service | Description |
|--------------|---------|-------------|
| `/` | editor | React SPA (catch-all, lowest priority) |
| `/ims/*` | opencase | CASE Provider API (read) |
| `/management/*` | opencase | Management API (write) |
| `/oauth/*` | opencase | OAuth endpoints |
| `/public/*` | opencase | Public endpoints (tenant lookup) |
| `/health` | opencase | Health check |
| `/.well-known/*` | opencase | OAuth/OIDC discovery |
| `/realms/*` | keycloak | OIDC authentication |
| `/admin/*` | keycloak | Keycloak admin console |
| `/resources/*` | keycloak | Keycloak static assets |

## Configuration

See `env.example` for available environment variables. Copy it to `.env` to customize:

## Project Structure

```
monorepo/
├── docker-compose.yml      # Production-like environment
├── docker-compose.dev.yml  # Dev overrides (hot-reload)
├── env.example             # Environment variable template
├── README.md               # This file
└── apps/
    ├── editor/             # React frontend
    │   ├── Dockerfile      # Vite dev server container
    │   ├── src/            # Source code (mounted for hot-reload)
    │   └── ...
    └── opencase/           # Node.js backend
        ├── Dockerfile      # Production build container
        ├── Dockerfile.dev  # Dev container (ts-node-dev)
        ├── data/           # Persisted framework data
        └── ...
```

## Individual App Documentation

- [OpenCASE README](apps/opencase/README.md) - Backend API documentation
- [Editor Architecture](apps/editor/docs/architecture.md) - Frontend architecture guide
