# CASE v1p1 API Migration Guide

## Overview

The CASE v1p1 CFPackage creation endpoint (`POST /management/tenants/{tenantId}/ims/case/v1p1/CFPackages`) has been updated to use the official 1EdTech CASE v1p1 JSON schema format. This change ensures full compliance with the official specification and allows proper validation before saving frameworks.

## What Changed

### Previous Format (Deprecated)

The endpoint previously accepted a custom format with lowercase property names:

```json
{
  "document": {
    "sourcedId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Mathematics Framework",
    "creator": "State Department of Education",
    "lastChangeDateTime": "2024-01-01T00:00:00Z"
  },
  "items": [
    {
      "sourcedId": "item-123",
      "fullStatement": "Solve linear equations",
      "lastChangeDateTime": "2024-01-01T00:00:00Z"
    }
  ],
  "associations": [
    {
      "sourcedId": "assoc-456",
      "associationType": "isChildOf",
      "originNode": "item-123",
      "destinationNode": "item-789",
      "lastChangeDateTime": "2024-01-01T00:00:00Z"
    }
  ],
  "rubrics": [
    {
      "id": "rubric-789",
      "title": "Assessment Rubric",
      "lastChangeDateTime": "2024-01-01T00:00:00Z"
    }
  ],
  "definitions": {
    "CFConcepts": [],
    "CFSubjects": []
  }
}
```

### New Format (Current)

The endpoint now accepts the official CASE v1p1 CFPackage format with capitalized property names:

```json
{
  "CFDocument": {
    "identifier": "550e8400-e29b-41d4-a716-446655440000",
    "uri": "/ims/case/v1p1/CFDocuments/550e8400-e29b-41d4-a716-446655440000",
    "title": "Mathematics Framework",
    "creator": "State Department of Education",
    "lastChangeDateTime": "2024-01-01T00:00:00Z"
  },
  "CFItems": [
    {
      "identifier": "item-123",
      "uri": "/ims/case/v1p1/CFItems/item-123",
      "fullStatement": "Solve linear equations",
      "lastChangeDateTime": "2024-01-01T00:00:00Z",
      "CFDocumentURI": {
        "title": "Mathematics Framework",
        "identifier": "550e8400-e29b-41d4-a716-446655440000",
        "uri": "/ims/case/v1p1/CFDocuments/550e8400-e29b-41d4-a716-446655440000"
      }
    }
  ],
  "CFAssociations": [
    {
      "identifier": "assoc-456",
      "uri": "/ims/case/v1p1/CFAssociations/assoc-456",
      "associationType": "isChildOf",
      "originNodeURI": {
        "title": "Item 123",
        "identifier": "item-123",
        "uri": "/ims/case/v1p1/CFItems/item-123"
      },
      "destinationNodeURI": {
        "title": "Item 789",
        "identifier": "item-789",
        "uri": "/ims/case/v1p1/CFItems/item-789"
      },
      "lastChangeDateTime": "2024-01-01T00:00:00Z"
    }
  ],
  "CFRubrics": [
    {
      "identifier": "rubric-789",
      "uri": "/ims/case/v1p1/CFRubrics/rubric-789",
      "title": "Assessment Rubric",
      "lastChangeDateTime": "2024-01-01T00:00:00Z"
    }
  ],
  "CFDefinitions": {
    "CFConcepts": [],
    "CFSubjects": [],
    "CFItemTypes": [],
    "CFLicenses": [],
    "CFAssociationGroupings": []
  },
  "extensions": {}
}
```

## Key Differences

### Property Name Changes

| Old Format | New Format | Notes |
|------------|------------|-------|
| `document` | `CFDocument` | Required, object |
| `items` | `CFItems` | Optional array |
| `associations` | `CFAssociations` | Optional array |
| `rubrics` | `CFRubrics` | Optional array |
| `definitions` | `CFDefinitions` | Optional object |

### Fields NOT Allowed in POST (But Present in GET)

⚠️ **Important**: The following fields are added to GET responses but **MUST NOT** be included in POST requests:

- **`CFDocument.CFPackageURI`**: This field is automatically added when retrieving a CFDocument via GET, but it's not part of the CFPackage POST schema. Do not include it when creating/updating a framework.
- **`CFItems[].CFDocumentURI`**: This field is automatically added when retrieving CFItems via GET, but it's not part of the CFPackage POST schema. Do not include it when creating/updating a framework.
- **`CFAssociations[].CFDocumentURI`**: This field is automatically added when retrieving CFAssociations via GET, but it's not part of the CFPackage POST schema. Do not include it when creating/updating a framework.

**Why?** In a CFPackage POST, the CFDocument, CFItems, and CFAssociations are already within the package context, so these linking fields are unnecessary and will cause validation errors.

**Note**: The server will automatically strip these fields if they are present, but it's best practice to omit them entirely.

### Field Name Changes Within Objects

#### CFDocument
- `sourcedId` → `identifier` (UUID format required)
- `uri` is now **required** (was optional)

#### CFItem
- `sourcedId` → `identifier` (UUID format required)
- `uri` is now **required** (was optional)
- `CFDocumentURI` is now **required** (LinkGenURI object with `title`, `identifier`, `uri`)

#### CFAssociation
- `sourcedId` → `identifier` (UUID format required)
- `uri` is now **required** (was optional)
- `originNode` → `originNodeURI` (LinkGenURI object)
- `destinationNode` → `destinationNodeURI` (LinkGenURI object)
- `CFAssociationGroupingURI` must use LinkURI format (UUID identifier required)

#### CFRubric
- `id` → `identifier` (UUID format required)
- `uri` is now **required** (was optional)
- `lastChangeDateTime` is now **required** (was optional)

### Required Fields Summary

#### CFDocument (Required)
- `identifier` (UUID)
- `uri` (string)
- `title` (string)
- `creator` (string)
- `lastChangeDateTime` (ISO 8601 date-time)

#### CFItem (Required when present)
- `identifier` (UUID)
- `uri` (string)
- `fullStatement` (string)
- `lastChangeDateTime` (ISO 8601 date-time)
- `CFDocumentURI` (LinkGenURI object)

#### CFAssociation (Required when present)
- `identifier` (UUID)
- `uri` (string)
- `associationType` (string - extensible enum)
- `originNodeURI` (LinkGenURI object)
- `destinationNodeURI` (LinkGenURI object)
- `lastChangeDateTime` (ISO 8601 date-time)

#### CFRubric (Required when present)
- `identifier` (UUID)
- `uri` (string)
- `lastChangeDateTime` (ISO 8601 date-time)

## Migration Steps

### Step 1: Update Property Names

Transform your payload structure:

```javascript
// OLD
const payload = {
  document: {...},
  items: [...],
  associations: [...],
  rubrics: [...],
  definitions: {...}
}

// NEW
const payload = {
  CFDocument: {...},
  CFItems: [...],
  CFAssociations: [...],
  CFRubrics: [...],
  CFDefinitions: {...}
}
```

### Step 2: Update Field Names Within Objects

#### For CFDocument:
```javascript
// OLD
{
  sourcedId: "550e8400-e29b-41d4-a716-446655440000",
  title: "Framework Title",
  creator: "Creator Name",
  lastChangeDateTime: "2024-01-01T00:00:00Z"
}

// NEW
{
  identifier: "550e8400-e29b-41d4-a716-446655440000",
  uri: "/ims/case/v1p1/CFDocuments/550e8400-e29b-41d4-a716-446655440000",
  title: "Framework Title",
  creator: "Creator Name",
  lastChangeDateTime: "2024-01-01T00:00:00Z"
}
```

#### For CFItems:
```javascript
// OLD
{
  sourcedId: "item-123",
  fullStatement: "Solve equations",
  lastChangeDateTime: "2024-01-01T00:00:00Z"
}

// NEW
{
  identifier: "item-123",
  uri: "/ims/case/v1p1/CFItems/item-123",
  fullStatement: "Solve equations",
  lastChangeDateTime: "2024-01-01T00:00:00Z",
  CFDocumentURI: {
    title: "Framework Title",
    identifier: "550e8400-e29b-41d4-a716-446655440000",
    uri: "/ims/case/v1p1/CFDocuments/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### For CFAssociations:
```javascript
// OLD
{
  sourcedId: "assoc-456",
  associationType: "isChildOf",
  originNode: "item-123",
  destinationNode: "item-789",
  lastChangeDateTime: "2024-01-01T00:00:00Z"
}

// NEW
{
  identifier: "assoc-456",
  uri: "/ims/case/v1p1/CFAssociations/assoc-456",
  associationType: "isChildOf",
  originNodeURI: {
    title: "Item 123",
    identifier: "item-123",
    uri: "/ims/case/v1p1/CFItems/item-123"
  },
  destinationNodeURI: {
    title: "Item 789",
    identifier: "item-789",
    uri: "/ims/case/v1p1/CFItems/item-789"
  },
  lastChangeDateTime: "2024-01-01T00:00:00Z"
}
```

#### For CFRubrics:
```javascript
// OLD
{
  id: "rubric-789",
  title: "Assessment Rubric",
  lastChangeDateTime: "2024-01-01T00:00:00Z"
}

// NEW
{
  identifier: "rubric-789",
  uri: "/ims/case/v1p1/CFRubrics/rubric-789",
  title: "Assessment Rubric",
  lastChangeDateTime: "2024-01-01T00:00:00Z"
}
```

### Step 3: Ensure UUID Format

All `identifier` fields must be valid UUIDs in the format: `8-4-4-4-12` hexadecimal characters.

Example: `550e8400-e29b-41d4-a716-446655440000`

### Step 4: Add Required URIs

All entities now require a `uri` field. Generate URIs following the pattern:
- CFDocument: `/ims/case/v1p1/CFDocuments/{identifier}`
- CFItem: `/ims/case/v1p1/CFItems/{identifier}`
- CFAssociation: `/ims/case/v1p1/CFAssociations/{identifier}`
- CFRubric: `/ims/case/v1p1/CFRubrics/{identifier}`

### Step 5: Add CFDocumentURI to CFItems

Every CFItem must include a `CFDocumentURI` LinkGenURI object:

```javascript
CFDocumentURI: {
  title: "Framework Title",
  identifier: "550e8400-e29b-41d4-a716-446655440000",
  uri: "/ims/case/v1p1/CFDocuments/550e8400-e29b-41d4-a716-446655440000"
}
```

### Step 6: Convert Node References to LinkGenURI Objects

For CFAssociations, convert simple string references to LinkGenURI objects:

```javascript
// OLD - Simple strings
originNode: "item-123"
destinationNode: "item-789"

// NEW - LinkGenURI objects
originNodeURI: {
  title: "Item 123",
  identifier: "item-123",
  uri: "/ims/case/v1p1/CFItems/item-123"
}
destinationNodeURI: {
  title: "Item 789",
  identifier: "item-789",
  uri: "/ims/case/v1p1/CFItems/item-789"
}
```

## Example Migration Function

Here's a helper function to migrate from the old format to the new format:

```javascript
function migrateToCFPackageFormat(oldPayload) {
  const basePath = '/ims/case/v1p1';
  
  // Migrate CFDocument
  const cfDocument = {
    identifier: oldPayload.document.sourcedId || oldPayload.document.identifier,
    uri: oldPayload.document.uri || `${basePath}/CFDocuments/${oldPayload.document.sourcedId || oldPayload.document.identifier}`,
    title: oldPayload.document.title,
    creator: oldPayload.document.creator,
    lastChangeDateTime: oldPayload.document.lastChangeDateTime,
    ...(oldPayload.document.description && { description: oldPayload.document.description }),
    ...(oldPayload.document.language && { language: oldPayload.document.language }),
    ...(oldPayload.document.frameworkType && { frameworkType: oldPayload.document.frameworkType }),
    ...(oldPayload.document.version && { version: oldPayload.document.version }),
    ...(oldPayload.document.adoptionStatus && { adoptionStatus: oldPayload.document.adoptionStatus }),
    ...(oldPayload.document.officialSourceURL && { officialSourceURL: oldPayload.document.officialSourceURL }),
    ...(oldPayload.document.publisher && { publisher: oldPayload.document.publisher }),
    ...(oldPayload.document.licenseURI && { licenseURI: oldPayload.document.licenseURI }),
    ...(oldPayload.document.notes && { notes: oldPayload.document.notes }),
    ...(oldPayload.document.statusStartDate && { statusStartDate: oldPayload.document.statusStartDate }),
    ...(oldPayload.document.statusEndDate && { statusEndDate: oldPayload.document.statusEndDate }),
    ...(oldPayload.document.subject && { subject: oldPayload.document.subject }),
    ...(oldPayload.document.subjectURI && { subjectURI: oldPayload.document.subjectURI }),
    ...(oldPayload.document.extensions && { extensions: oldPayload.document.extensions })
  };
  
  // Migrate CFItems
  const cfItems = (oldPayload.items || []).map(item => ({
    identifier: item.sourcedId || item.identifier,
    uri: item.uri || `${basePath}/CFItems/${item.sourcedId || item.identifier}`,
    fullStatement: item.fullStatement,
    lastChangeDateTime: item.lastChangeDateTime,
    CFDocumentURI: {
      title: cfDocument.title,
      identifier: cfDocument.identifier,
      uri: cfDocument.uri
    },
    ...(item.humanCodingScheme && { humanCodingScheme: item.humanCodingScheme }),
    ...(item.listEnumeration && { listEnumeration: item.listEnumeration }),
    ...(item.alternativeLabel && { alternativeLabel: item.alternativeLabel }),
    ...(item.abbreviatedStatement && { abbreviatedStatement: item.abbreviatedStatement }),
    ...(item.CFItemType && { CFItemType: item.CFItemType }),
    ...(item.CFItemTypeURI && { CFItemTypeURI: item.CFItemTypeURI }),
    ...(item.conceptKeywords && { conceptKeywords: item.conceptKeywords }),
    ...(item.conceptKeywordsURI && { conceptKeywordsURI: item.conceptKeywordsURI }),
    ...(item.notes && { notes: item.notes }),
    ...(item.language && { language: item.language }),
    ...(item.subject && { subject: item.subject }),
    ...(item.subjectURI && { subjectURI: item.subjectURI }),
    ...(item.educationLevel && { educationLevel: item.educationLevel }),
    ...(item.licenseURI && { licenseURI: item.licenseURI }),
    ...(item.statusStartDate && { statusStartDate: item.statusStartDate }),
    ...(item.statusEndDate && { statusEndDate: item.statusEndDate }),
    ...(item.extensions && { extensions: item.extensions })
  }));
  
  // Migrate CFAssociations
  const cfAssociations = (oldPayload.associations || []).map(assoc => {
    const originId = assoc.originNode || assoc.originNodeURI?.identifier;
    const destId = assoc.destinationNode || assoc.destinationNodeURI?.identifier;
    
    return {
      identifier: assoc.sourcedId || assoc.identifier,
      uri: assoc.uri || `${basePath}/CFAssociations/${assoc.sourcedId || assoc.identifier}`,
      associationType: assoc.associationType,
      originNodeURI: assoc.originNodeURI || {
        title: `Item ${originId}`,
        identifier: originId,
        uri: `${basePath}/CFItems/${originId}`
      },
      destinationNodeURI: assoc.destinationNodeURI || {
        title: `Item ${destId}`,
        identifier: destId,
        uri: `${basePath}/CFItems/${destId}`
      },
      lastChangeDateTime: assoc.lastChangeDateTime,
      ...(assoc.sequenceNumber !== undefined && { sequenceNumber: assoc.sequenceNumber }),
      ...(assoc.CFAssociationGroupingURI && { CFAssociationGroupingURI: assoc.CFAssociationGroupingURI }),
      ...(assoc.notes && { notes: assoc.notes }),
      ...(assoc.extensions && { extensions: assoc.extensions })
    };
  });
  
  // Migrate CFRubrics
  const cfRubrics = (oldPayload.rubrics || []).map(rubric => ({
    identifier: rubric.id || rubric.identifier || rubric.sourcedId,
    uri: rubric.uri || `${basePath}/CFRubrics/${rubric.id || rubric.identifier || rubric.sourcedId}`,
    lastChangeDateTime: rubric.lastChangeDateTime || new Date().toISOString(),
    ...(rubric.title && { title: rubric.title }),
    ...(rubric.description && { description: rubric.description }),
    ...(rubric.CFRubricCriteria && { CFRubricCriteria: rubric.CFRubricCriteria }),
    ...(rubric.extensions && { extensions: rubric.extensions })
  }));
  
  // Build new payload
  const newPayload = {
    CFDocument: cfDocument,
    ...(cfItems.length > 0 && { CFItems: cfItems }),
    ...(cfAssociations.length > 0 && { CFAssociations: cfAssociations }),
    ...(cfRubrics.length > 0 && { CFRubrics: cfRubrics }),
    ...(oldPayload.definitions && { CFDefinitions: oldPayload.definitions }),
    ...(oldPayload.extensions && { extensions: oldPayload.extensions })
  };
  
  return newPayload;
}
```

## Validation Errors

If validation fails, you'll receive a `400 Bad Request` response:

```json
{
  "error": "validation_failed",
  "message": "Schema validation failed: [detailed error message]"
}
```

Common validation errors:
- Missing required fields (`identifier`, `uri`, `lastChangeDateTime`, etc.)
- Invalid UUID format for `identifier` fields
- Missing `CFDocumentURI` in CFItems
- Invalid `associationType` enum value
- Invalid date-time format

## Benefits of the New Format

1. **Compliance**: Full compliance with official 1EdTech CASE v1p1 specification
2. **Consistency**: Input format matches GET response format
3. **Validation**: Proper schema validation before saving
4. **Interoperability**: Compatible with other CASE-compliant systems
5. **Future-proof**: Aligned with official specification updates

## Backward Compatibility

⚠️ **Important**: The old format is no longer supported. All clients must migrate to the new format.

## Support

For questions or issues with migration, please refer to:
- Official CASE v1p1 Specification: https://www.imsglobal.org/spec/case/v1p1/
- Schema Documentation: `schemas/official/case-v1p1-cfpackage.json`
- Compliance Report: `CASE_V1P1_COMPLIANCE_REPORT.md`
