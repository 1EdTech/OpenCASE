# CASE v1p1 API Changes - Summary

## Breaking Change: POST Endpoint Format Update

The `POST /management/tenants/{tenantId}/ims/case/v1p1/CFPackages` endpoint now requires the **official CASE v1p1 CFPackage format** instead of the previous custom format.

## Quick Reference

### Property Name Changes

| Old | New |
|-----|-----|
| `document` | `CFDocument` |
| `items` | `CFItems` |
| `associations` | `CFAssociations` |
| `rubrics` | `CFRubrics` |
| `definitions` | `CFDefinitions` |

### Field Name Changes

- `sourcedId` → `identifier` (all entities)
- `id` → `identifier` (CFRubric)
- `originNode` → `originNodeURI` (LinkGenURI object)
- `destinationNode` → `destinationNodeURI` (LinkGenURI object)

### New Required Fields

- **All entities**: `uri` field is now required
- **CFItem**: `CFDocumentURI` LinkGenURI object is now required
- **CFRubric**: `lastChangeDateTime` is now required

### Example Transformation

**Before:**
```json
{
  "document": {
    "sourcedId": "doc-123",
    "title": "Framework"
  },
  "items": [{
    "sourcedId": "item-1",
    "fullStatement": "Statement"
  }]
}
```

**After:**
```json
{
  "CFDocument": {
    "identifier": "doc-123",
    "uri": "/ims/case/v1p1/CFDocuments/doc-123",
    "title": "Framework",
    "creator": "Creator Name",
    "lastChangeDateTime": "2024-01-01T00:00:00Z"
  },
  "CFItems": [{
    "identifier": "item-1",
    "uri": "/ims/case/v1p1/CFItems/item-1",
    "fullStatement": "Statement",
    "lastChangeDateTime": "2024-01-01T00:00:00Z",
    "CFDocumentURI": {
      "title": "Framework",
      "identifier": "doc-123",
      "uri": "/ims/case/v1p1/CFDocuments/doc-123"
    }
  }]
}
```

## Why This Change?

- ✅ Full compliance with official 1EdTech CASE v1p1 specification
- ✅ Input format matches GET response format (consistency)
- ✅ Proper schema validation before saving
- ✅ Better error messages for invalid data

## Migration

See `CASE_V1P1_API_MIGRATION_GUIDE.md` for detailed migration instructions and helper functions.

## Impact

- ⚠️ **Breaking Change**: Old format is no longer accepted
- ✅ All requests are validated against official schema
- ✅ Better error messages for validation failures
