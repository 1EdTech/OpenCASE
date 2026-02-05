# OAuth Service Usage Guide

## Quick Start

The OAuth service is automatically initialized when the server starts. On first run, it will:

1. Generate RSA 2048-bit key pairs in `data/oauth/keys/`
2. Create a default client configuration file at `data/oauth/clients.json`

## Getting an Access Token

### Using curl

```bash
curl -X POST http://localhost:8080/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=demo-client" \
  -d "client_secret=demo-secret" \
  -d "scope=case.read case.write"
```

### Using JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:8080/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'demo-client',
    client_secret: 'demo-secret',
    scope: 'case.read case.write'
  })
});

const tokenData = await response.json();
console.log(tokenData.access_token);
```

## Using the Token

Once you have an access token, use it in the `Authorization` header:

```bash
TOKEN="<your-access-token>"

curl -X GET http://localhost:8080/ims/case/v1p1/CFPackages/doc-123 \
  -H "Authorization: Bearer $TOKEN"
```

## Default Client

The service creates a default client on first run:

- **Client ID**: `demo-client`
- **Client Secret**: `demo-secret`
- **Tenant ID**: `demo`
- **Scopes**: `case.read`, `case.write`

## Adding New Clients

Edit `data/oauth/clients.json`:

```json
[
  {
    "clientId": "demo-client",
    "clientSecret": "demo-secret",
    "tenantId": "demo",
    "grantTypes": ["client_credentials"],
    "scopes": ["case.read", "case.write"],
    "active": true
  },
  {
    "clientId": "my-client",
    "clientSecret": "my-secret",
    "tenantId": "my-tenant",
    "grantTypes": ["client_credentials"],
    "scopes": ["case.read"],
    "active": true
  }
]
```

Restart the server to load new clients.

## Token Claims

The issued JWT contains:

- `sub`: Client ID
- `tenantId`: Tenant identifier
- `client_id`: Client ID
- `iss`: Token issuer (default: `opencase-oauth`)
- `aud`: Audience (from `JWT_AUDIENCE` env var)
- `scope`: Requested scopes (if provided)
- `exp`: Expiration time (default: 1 hour)

## Environment Variables

- `OAUTH_KEY_DIR`: Directory for RSA keys (default: `data/oauth/keys`)
- `OAUTH_CLIENTS_FILE`: Path to clients JSON (default: `data/oauth/clients.json`)
- `OAUTH_ISSUER`: Token issuer claim (default: `opencase-oauth`)
- `JWT_AUDIENCE`: Token audience (default: `example-audience`)

## Architecture

The OAuth service is implemented as a separate domain following DDD:

- **Domain**: `OAuthClient`, `AccessToken`
- **Application**: `IssueToken` command
- **Infrastructure**: `JwtSignerImpl`, `KeyManager`, `FileOAuthClientRepository`
- **Interfaces**: HTTP controllers

This keeps it cleanly separated from the CASE domain while sharing infrastructure.


