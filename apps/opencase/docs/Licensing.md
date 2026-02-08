# Licensing in OpenCASE

## Overview

OpenCASE implements a framework-level licensing system that controls two things:

1. **Rights-to-use** — what consumers of a framework are allowed to do with it.
2. **Public access** — whether the framework can be read from the CASE Provider API without authentication.

The license is set by the framework author in the CASE Editor and stored as a `licenseURI` on the `CFDocument`. OpenCASE uses the license to decide, at request time, whether an unauthenticated caller can access the framework.

## Available Licenses

Every tenant is seeded with five licenses covering the spectrum from fully open to fully private:

| License | Based On | Public Access? |
|---|---|---|
| **Public Domain (CC0 1.0)** | Creative Commons Zero | Yes |
| **Open — Credit Required (CC BY 4.0)** | Creative Commons Attribution | Yes |
| **Educational Use (CC BY-NC-SA 4.0)** | Creative Commons Attribution-NonCommercial-ShareAlike | Yes |
| **View and Share Only (CC BY-NC-ND 4.0)** | Creative Commons Attribution-NonCommercial-NoDerivatives | No |
| **Private — All Rights Reserved** | Standard copyright | No |

Licenses are stored as `CFLicense` definition records. Each has a stable UUID that is consistent across all tenants.

### What "Public Access" Means

The first three licenses (CC0, CC BY, CC BY-NC-SA) grant **unauthenticated read access** to the framework via the CASE Provider API. Anyone can fetch the CFPackage, CFDocument, CFItems, CFAssociations, etc. without a bearer token.

The remaining two licenses (CC BY-NC-ND and All Rights Reserved) require authentication. Unauthenticated requests receive a `401 Unauthorized` response.

A framework with **no license set** is treated as private.

## How It Works

### Setting a License (CASE Editor)

In the CASE Editor, the license is selected on the framework node's side panel:

1. Open a framework in the editor.
2. Click the framework (root) node.
3. In the properties panel on the right, find the **License** dropdown.
4. Select a license. A description of the selected license is shown below the dropdown.
5. Save or publish the framework.

The selection is stored as a `licenseURI` on the `CFDocument`:

```json
{
  "licenseURI": {
    "title": "Open — Credit Required (CC BY 4.0)",
    "identifier": "c0c0c0c0-0000-4000-a000-000000000002",
    "uri": "https://opencase.example.com/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000002"
  }
}
```

The `uri` is a dereferenceable link — a `GET` request to that URL returns the full `CFLicense` record including the license text.

### Save Flow

When the author saves in the editor, the license flows through the full pipeline:

```
UI dropdown selection
  → EditorContext (node cfDocument.licenseURI)
    → fromEditorGraph (FrameworkMetadata.licenseURI)
      → frameworkToCfPackage (CFDocument.licenseURI)
        → toOpenCaseFormat (CaseV1p1Document.licenseURI)
          → POST to OpenCASE Management API
```

### Access Control (OpenCASE API)

The CASE Provider API (`/ims/case/v1p0/*` and `/ims/case/v1p1/*`) uses **optional authentication**. Every request passes through middleware that:

- If a valid bearer token is present: sets `req.isAuthenticated = true` and extracts the `tenantId` from the JWT.
- If no token (or invalid token): sets `req.isAuthenticated = false` and proceeds without a `tenantId`.

Controllers then check the framework's license before returning data:

```
Request arrives at GET /ims/case/v1p1/CFPackages/{id}
  → Resolve document globally (IDs are unique across all tenants)
  → If not found → 404
  → If request is unauthenticated:
      → Check isDocumentPublic(tenantId, version, docId)
      → If the framework's license is NOT in the public set → 401
  → If authenticated or public → return the CFPackage
```

This check happens on every entity endpoint (CFPackages, CFDocuments, CFItems, CFAssociations, CFItemAssociations, CFRubrics).

### How Public/Private Is Determined

The `FileFrameworkStore` maintains a `licenseIdentifier` in each document's metadata index. When a framework is published, the license identifier from `CFDocument.licenseURI` is stored alongside it.

At request time, `isDocumentPublic()` checks if the stored license identifier is in the `PUBLIC_LICENSE_IDS` set:

```
Public Domain (CC0 1.0)           → public
Open — Credit Required (CC BY 4.0) → public
Educational Use (CC BY-NC-SA 4.0)  → public
View and Share Only (CC BY-NC-ND 4.0) → private (requires auth)
Private — All Rights Reserved      → private (requires auth)
No license set                     → private (requires auth)
```

### Management API

The Management API (`/management/*`) always requires authentication regardless of the framework's license. Licenses only affect the read-only CASE Provider API.

## License in the CFPackage Response

When a CFPackage is returned via `GET /ims/case/v1p1/CFPackages/{id}`, the license appears in two places:

### 1. CFDocument.licenseURI

A link reference to the license:

```json
{
  "CFPackage": {
    "CFDocument": {
      "identifier": "...",
      "title": "My Framework",
      "licenseURI": {
        "title": "Open — Credit Required (CC BY 4.0)",
        "identifier": "c0c0c0c0-0000-4000-a000-000000000002",
        "uri": "https://opencase.example.com/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000002"
      }
    }
  }
}
```

### 2. CFDefinitions.CFLicenses

The full license record(s) referenced by the package (document and items). Only the licenses actually used by the framework are included — not the entire tenant catalog:

```json
{
  "CFPackage": {
    "CFDefinitions": {
      "CFLicenses": [
        {
          "identifier": "c0c0c0c0-0000-4000-a000-000000000002",
          "uri": "https://opencase.example.com/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000002",
          "title": "Open — Credit Required (CC BY 4.0)",
          "description": "Free to use, share, and adapt. You must give credit to the author.",
          "licenseText": "Creative Commons Attribution 4.0 International (CC BY 4.0)\n\nYou are free to:\n- Share — copy and redistribute the material in any medium or format.\n- Adapt — remix, transform, and build upon the material for any purpose, even commercially.\n\nUnder the following terms:\n- Attribution — You must give appropriate credit...\n\nhttps://creativecommons.org/licenses/by/4.0/",
          "lastChangeDateTime": "2025-01-01T00:00:00.000Z"
        }
      ]
    }
  }
}
```

## Dereferencing a License URI

The `licenseURI.uri` on a CFDocument is a standard CASE endpoint that can be dereferenced:

```
GET /ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000002
```

Returns:

```json
{
  "CFLicense": {
    "identifier": "c0c0c0c0-0000-4000-a000-000000000002",
    "uri": "https://opencase.example.com/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000002",
    "title": "Open — Credit Required (CC BY 4.0)",
    "description": "Free to use, share, and adapt. You must give credit to the author.",
    "licenseText": "Creative Commons Attribution 4.0 International (CC BY 4.0)...",
    "lastChangeDateTime": "2025-01-01T00:00:00.000Z"
  }
}
```

The `licenseText` field contains the human-readable license terms. For Creative Commons licenses this includes the freedoms granted, conditions, and a link to the canonical license URL.

## Quick Reference

| Action | Result |
|---|---|
| Set license to CC0, CC BY, or CC BY-NC-SA | Framework is publicly accessible without auth |
| Set license to CC BY-NC-ND or All Rights Reserved | Framework requires authentication to read |
| Set no license | Framework requires authentication to read |
| Change license and re-publish | Access control updates immediately |
| Authenticated user | Can always read any framework in their tenant |
