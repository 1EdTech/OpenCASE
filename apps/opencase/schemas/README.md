# CASE v1.1 JSON Schema Validation

This directory contains JSON Schema files for validating CASE v1.1 framework data structures.

## Schema Files

- **case-v1p1-cfpackage.json** - Validates complete CFPackage (document + items + associations + rubrics + definitions)
- **case-v1p1-cfdocument.json** - Validates CFDocument updates
- **case-v1p1-cfitem.json** - Validates CFItem updates  
- **case-v1p1-cfassociation.json** - Validates CFAssociation updates

## Validation Rules Captured

### UUID Validation
All `sourcedId` fields (and `identifier` fields in LinkURI objects) **MUST** be valid UUIDs in the format: `8-4-4-4-12` hexadecimal characters (e.g., `c739fefe-4f94-4a75-9203-e8621a7c2a1a`)

### Required Fields

#### CFDocument (Multiplicity [1])
- `sourcedId` (UUID)
- `uri` (AnyURI)
- `title` (string)
- `creator` (string)
- `lastChangeDateTime` (date-time)

#### CFItem (Multiplicity [1])
- `sourcedId` (UUID)
- `uri` (AnyURI)
- `fullStatement` (string)
- `lastChangeDateTime` (date-time)
- `CFDocumentURI` (LinkGenURI object with required: title, identifier, uri)

#### CFAssociation (Multiplicity [1])
- `sourcedId` (UUID)
- `uri` (AnyURI)
- `associationType` (string - extensible enum)
- `originNodeURI` (LinkGenURI - required: title, identifier, uri)
- `destinationNodeURI` (LinkGenURI - required: title, identifier, uri)
- `lastChangeDateTime` (date-time)

#### LinkGenURI (when used, all required [1])
- `title` (string)
- `identifier` (string - may or may not be UUID)
- `uri` (AnyURI)
- `targetType` (string, optional - default "CASE")

#### LinkURI (when used, all required [1])
- `title` (string)
- `identifier` (UUID)
- `uri` (AnyURI)

### Enum Values

#### caseVersion
- If present, **MUST** be `"1.1"` (enum: ["1.1"])

#### associationType (extensible enum)
Standard values include:
- `exactMatchOf` - equivalent to
- `exemplar` - target is an example of best practice
- `hasSkillLevel` - destination defines a skill level
- `isChildOf` - structural parent-child relationship
- `isPartOf` - origin is included in destination
- `isPeerOf` - peer relationship
- `isRelatedTo` - related in some way
- `isTranslationOf` - target is a translation (CASE 1.1)
- `precedes` - origin comes before destination
- `replacedBy` - origin supplanted by destination

### Date Formats

- `lastChangeDateTime` - **MUST** be ISO 8601 date-time format (e.g., `2025-01-01T12:00:00.000Z`)
- `statusStartDate` - **MUST** be ISO 8601 date format (e.g., `2025-01-01`)
- `statusEndDate` - **MUST** be ISO 8601 date format (e.g., `2025-01-01`)

### URI Formats

- All `uri` fields **MUST** be valid URIs (validated with `format: "uri"`)
- All `officialSourceURL` fields **MUST** be valid URIs

### Array Constraints

- `subject` - Can be a string OR array of strings
- `conceptKeywords` - Array of strings (0..unbounded)
- `educationLevel` - Array of strings (0..unbounded)
- `subjectURI` - Array of LinkURI objects (0..unbounded)

### CFPackage Structure

- **MUST** contain exactly one `document` (CFDocument)
- `items` - Array (0..unbounded, but typically at least one)
- `associations` - Array (0..unbounded)
- `rubrics` - Array (0..unbounded)
- `definitions` - Object (0..1) containing:
  - `CFConcepts` - Array
  - `CFSubjects` - Array
  - `CFItemTypes` - Array
  - `CFLicenses` - Array
  - `CFAssociationGroupings` - Array

## Usage

These schemas are automatically loaded by the OpenCASE application on startup and used to validate:
- Framework creation (`POST /admin/tenants/{tenantId}/frameworks`)
- Document updates (`PUT /management/tenants/{tenantId}/CFDocuments/{id}`)
- Item updates (`PUT /management/tenants/{tenantId}/CFItems/{id}`)
- Association updates (`PUT /management/tenants/{tenantId}/CFAssociations/{id}`)

## Validation Errors

When validation fails, the API returns a `400 Bad Request` with:
```json
{
  "error": "validation_failed",
  "message": "Schema validation failed: [detailed error message]"
}
```

The error message includes details about which fields failed validation and why.

## References

- CASE v1.1 Data Model Specification: `docs/DataModel.md`
- CASE v1.1 REST Bindings: `docs/RESTBindings.md`













