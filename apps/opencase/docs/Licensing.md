# Licensing in OpenCASE

## Overview

A framework has two independent settings:

1. **License** — the legal terms for how the framework may be used. Stored as `licenseURI` on the `CFDocument`.
2. **Access** — whether the CASE Provider API requires a sign-in to read the framework. Stored as `extensions['ext:opencase'].publicAccess`.

Sign-in is required unless **Make public** is turned on. Choosing an open license does not make the framework readable without authentication.

## Available Licenses

Every tenant is seeded with five licenses covering the spectrum from fully open to fully private:

| License | Based On |
|---|---|
| **Public Domain (CC0 1.0)** | Creative Commons Zero |
| **Open — Credit Required (CC BY 4.0)** | Creative Commons Attribution |
| **Educational Use (CC BY-NC-SA 4.0)** | Creative Commons Attribution-NonCommercial-ShareAlike |
| **View and Share Only (CC BY-NC-ND 4.0)** | Creative Commons Attribution-NonCommercial-NoDerivatives |
| **Private — All Rights Reserved** | Standard copyright |

Licenses are stored as `CFLicense` definition records. Each has a stable UUID that is consistent across all tenants. A framework with no license set still has a license of “none”; that does not change who can read it.

## How It Works

### Setting a License (CASE Editor)

In the CASE Editor, the license is selected on the framework node's side panel:

1. Open a framework in the editor.
2. Click the framework (root) node.
3. In the properties panel on the right, find the **License** section.
4. Select a license. A description of the selected license is shown below the dropdown.
5. Save the framework.

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

### Make public (CASE Editor)

Access is a separate control on the same framework properties panel:

1. Open the framework node.
2. In **Access**, turn on **Make public**.
3. Save the framework.

The flag is stored on the document, not on the license:

```json
{
  "extensions": {
    "ext:opencase": {
      "publicAccess": true
    }
  }
}
```

Leaving it off (the default) omits the flag. Readers must sign in. Home-screen cards show a **Public** badge after a public framework is saved.

Frameworks that were previously readable because of an open license stay private until **Make public** is turned on and saved.

### Access Control (OpenCASE API)

The CASE Provider API (`/ims/case/v1p0/*` and `/ims/case/v1p1/*`) uses **optional authentication**. Every request passes through middleware that:

- If a valid bearer token is present: sets `req.isAuthenticated = true` and extracts the `tenantId` from the JWT.
- If no token (or invalid token): sets `req.isAuthenticated = false` and proceeds without a `tenantId`.

Controllers then check the framework's access flag before returning data:

```
Request arrives at GET /ims/case/v1p1/CFPackages/{id}
  → Resolve document globally (IDs are unique across all tenants)
  → If not found → 404
  → If request is unauthenticated:
      → Check isDocumentPublic(tenantId, version, docId)
      → If publicAccess is not true → 401
  → If authenticated or public → return the CFPackage
```

This check happens on every entity endpoint (CFPackages, CFDocuments, CFItems, CFAssociations, CFItemAssociations, CFRubrics).

### How Public/Private Is Determined

When a framework is saved, `FileFrameworkStore` copies `extensions['ext:opencase'].publicAccess` into the document index.

At request time, `isDocumentPublic()` is true only when that flag is `true`:

```
Make public on   → readable without signing in
Make public off  → sign-in required
No flag set      → sign-in required
Any license      → does not change the above
```

### Management API

The Management API (`/management/*`) always requires authentication. **Make public** only affects the read-only CASE Provider API.

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
| Leave **Make public** off (default) | Framework requires authentication to read |
| Turn **Make public** on and save | Framework is readable without signing in |
| Turn **Make public** off and save | Sign-in is required again |
| Change the license | Legal terms change; who can read the framework stays the same |
| Authenticated user | Can read frameworks in their tenant whether or not they are public |
