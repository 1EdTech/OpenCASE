# Framework Management Screen - API Endpoint Guide

This guide explains how to build a React application screen for displaying and managing a single Competency Framework using the OpenCASE API. It's designed for developers (including LLMs) who are new to the CASE specification.

## Table of Contents
1. [Understanding CASE Resources](#understanding-case-resources)
2. [Discovery and Authentication](#discovery-and-authentication)
3. [Building the Framework Management Screen](#building-the-framework-management-screen)
4. [Endpoint Reference](#endpoint-reference)

---

## Understanding CASE Resources

### Core Concepts

**CASE (Competencies & Academic Standards Exchange)** is a specification for exchanging learning standards and competencies. Think of it as a way to represent educational standards (like "Students should be able to solve quadratic equations") in a structured, machine-readable format.

### Resource Types and Their Relationships

#### 1. **CFPackage** - The Complete Bundle
- **What it is**: A complete, self-contained package containing everything needed to represent a competency framework
- **Contains**: One CFDocument, all CFItems, all CFAssociations, all CFRubrics, and all Definitions
- **Use case**: When you need everything at once (e.g., exporting/importing a framework)
- **Think of it as**: A ZIP file containing all framework data

#### 2. **CFDocument** - The Framework Root
- **What it is**: The root/top-level container for a competency framework
- **Contains**: Metadata about the framework (title, description, publisher, version, etc.)
- **Does NOT contain**: The actual competency items (those are CFItems)
- **Use case**: Displaying framework metadata, listing available frameworks
- **Think of it as**: The cover page or title page of a standards document

#### 3. **CFItem** - Individual Competencies/Standards
- **What it is**: A single competency or academic standard statement
- **Contains**: The actual learning objective (e.g., "Students will understand fractions")
- **Structure**: Can have parent-child relationships (hierarchical)
- **Use case**: Displaying the actual competencies in a tree/hierarchical view
- **Think of it as**: Individual bullet points or statements in a standards document
- **Example**: "Grade 3 Math Standard 3.1: Students will add and subtract within 1000"

#### 4. **CFAssociation** - Relationships Between Items
- **What it is**: Defines relationships between CFItems or between CFDocuments
- **Types**: Various relationship types (e.g., "isPartOf", "exactMatchOf", "isChildOf", "precedes", etc.)
- **Use case**: Showing how competencies relate to each other, building competency maps
- **Think of it as**: Arrows or links connecting different standards
- **Example**: "Algebra Standard A.1 is a prerequisite for Algebra Standard A.2"

#### 5. **CFRubric** - Assessment Criteria
- **What it is**: A rubric/matrix for assessing competency achievement
- **Contains**: Criteria (rows) and performance levels (columns)
- **Linked to**: One or more CFItems (typically one rubric per item)
- **Use case**: Displaying how to assess whether a student has met a competency
- **Think of it as**: A grading rubric (e.g., "Novice", "Proficient", "Advanced")
- **Example**: A rubric showing 4 levels of proficiency for "Can solve quadratic equations"

#### 6. **CFPackage vs Individual Resources**
- **CFPackage**: Get everything in one call (efficient for initial load)
- **Individual Resources**: Get specific pieces (efficient for updates, partial views)

### Supporting/Definition Resources

These are metadata and vocabulary definitions used within a framework:

#### 7. **CFSubject** - Subject Areas
- **What it is**: The subject/discipline (e.g., "Mathematics", "Science", "English Language Arts")
- **Use case**: Filtering frameworks by subject

#### 8. **CFConcept** - Vocabulary Terms
- **What it is**: Concepts/terms used in the framework (e.g., "fraction", "equation", "thesis statement")
- **Use case**: Building glossaries, semantic search

#### 9. **CFItemType** - Types of Items
- **What it is**: Categories for different types of competencies (e.g., "Skill", "Knowledge", "Disposition")
- **Use case**: Filtering or grouping items by type

#### 10. **CFLicense** - Usage Rights
- **What it is**: License information for using the framework
- **Use case**: Displaying copyright/usage information

#### 11. **CFAssociationGrouping** - Grouped Associations
- **What it is**: A way to group related associations together
- **Use case**: Organizing complex relationship networks

---

## Discovery and Authentication

### Step 1: Get the OpenAPI Specification (Discovery)

**Endpoint**: `GET /ims/case/v1p1/discovery/imscasev1p1_openapi3_v1p0.json`

**Purpose**: Discover all available endpoints, their parameters, request/response schemas, and authentication requirements.

**Response**: A complete OpenAPI 3.0 specification document that describes:
- All available endpoints
- Request/response schemas
- Authentication requirements
- Query parameters (pagination, filtering, sorting)

**Usage in React**:
```javascript
// Fetch the OpenAPI spec to understand available endpoints
const response = await fetch('/ims/case/v1p1/discovery/imscasev1p1_openapi3_v1p0.json');
const openApiSpec = await response.json();
// Use openApiSpec to dynamically understand available endpoints
```

### Step 2: Authenticate

**OAuth2 Endpoints**:
- `GET /oauth/authorize` - Authorization endpoint (for authorization_code flow)
- `POST /oauth/token` - Token endpoint
- `GET /.well-known/oauth-authorization-server` - OAuth discovery

**Required Scopes**:
- `case.read` - Read-only access (for viewing)
- `case.write` - Read and write access (for editing)
- `case.owner` - Tenant administration (for management operations)

**Example**: After authentication, include the access token in all requests:
```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

---

## Building the Framework Management Screen

### Scenario: Display and Manage a Single Framework

Assume you want to build a screen that:
1. Shows framework metadata
2. Displays all competency items in a hierarchical tree
3. Shows associations between items
4. Displays rubrics for assessment
5. Allows editing/deleting items

### Recommended Approach: Two Strategies

#### Strategy A: Load Everything at Once (Simpler, Good for Small Frameworks)

**Step 1: Get the Complete Package**
```
GET /ims/case/v1p1/CFPackages/{frameworkDocumentId}
```
- Returns: Complete CFPackage with document, items, associations, rubrics, definitions
- **Pros**: One API call, everything is available
- **Cons**: Large payload for big frameworks, harder to update individual pieces

**Response Structure**:
```json
{
  "CFPackage": {
    "CFDocument": { /* framework metadata */ },
    "CFItems": [ /* array of all items */ ],
    "CFAssociations": [ /* array of all associations */ ],
    "CFRubrics": [ /* array of all rubrics */ ],
    "CFDefinitions": {
      "CFConcepts": [ /* concepts */ ],
      "CFSubjects": [ /* subjects */ ],
      "CFItemTypes": [ /* item types */ ],
      "CFLicenses": [ /* licenses */ ],
      "CFAssociationGroupings": [ /* groupings */ ]
    }
  }
}
```

**Step 2: Parse and Display**
- Extract `CFDocument` for header/metadata section
- Build hierarchical tree from `CFItems` (use `parentIds` or `children` relationships)
- Render associations as connections/links between items
- Display rubrics linked to items

#### Strategy B: Load Incrementally (Better for Large Frameworks)

**Step 1: Get Framework Document**
```
GET /ims/case/v1p1/CFDocuments/{frameworkDocumentId}
```
- Returns: Just the CFDocument metadata
- Use for: Displaying framework title, description, publisher info

**Step 2: Get All Items (with pagination if needed)**
```
GET /ims/case/v1p1/CFItemAssociations/{itemId}
```
- Note: This endpoint returns associations FOR a specific item
- **Better approach**: Use CFPackage to get all items, or implement lazy loading

**Step 3: Get Associations (as needed)**
```
GET /ims/case/v1p1/CFAssociations/{associationId}
```
- Get individual associations when needed
- Or: Extract from CFPackage if using Strategy A

**Step 4: Get Rubrics (as needed)**
```
GET /ims/case/v1p1/CFRubrics/{rubricId}
```
- Get rubrics when user expands an item
- Or: Extract from CFPackage if using Strategy A

### Recommended: Hybrid Approach

**Initial Load**:
1. Get CFPackage to load everything quickly
2. Cache the data in React state/context

**Updates**:
- Use individual endpoints for updates:
  - `PUT /management/tenants/{tenantId}/CFItems/{id}` - Update an item
  - `PUT /management/tenants/{tenantId}/CFDocuments/{id}` - Update document
  - `DELETE /management/tenants/{tenantId}/CFItems/{id}` - Delete an item

**Refresh**:
- After updates, optionally reload CFPackage or refresh individual resources

---

## Endpoint Reference

### Public CASE API Endpoints (Read-Only)

All endpoints require authentication (Bearer token) and are prefixed with `/ims/case/v1p1/`

#### Framework Discovery & Listing

**Get All Documents** (List all frameworks):
```
GET /ims/case/v1p1/CFDocuments
Query Parameters:
  - limit: number (pagination)
  - offset: number (pagination)
  - sort: string (sort field)
  - orderBy: 'asc' | 'desc'
  - filter: string (filter criteria)
  - fields: string (comma-separated field list)
```
Returns: `CFDocumentSet` - Array of CFDocument objects with pagination metadata

**Get Single Document**:
```
GET /ims/case/v1p1/CFDocuments/{sourcedId}
```
Returns: `{ CFDocument: {...} }`

#### Complete Package

**Get Complete Package**:
```
GET /ims/case/v1p1/CFPackages/{sourcedId}
```
Returns: `{ CFPackage: { CFDocument, CFItems[], CFAssociations[], CFRubrics[], CFDefinitions } }`

#### Individual Resources

**Get Single Item**:
```
GET /ims/case/v1p1/CFItems/{sourcedId}
```
Returns: `{ CFItem: {...} }`

**Get Item Associations** (Associations FOR a specific item):
```
GET /ims/case/v1p1/CFItemAssociations/{sourcedId}
```
Returns: `{ CFItem: {...}, CFAssociations: [...] }` - The item plus all its associations

**Get Single Association**:
```
GET /ims/case/v1p1/CFAssociations/{sourcedId}
```
Returns: `{ CFAssociation: {...} }`

**Get Single Rubric**:
```
GET /ims/case/v1p1/CFRubrics/{sourcedId}
```
Returns: `{ CFRubric: {...} }`

#### Definition Resources

**Get Subject**:
```
GET /ims/case/v1p1/CFSubjects/{sourcedId}
```

**Get Concept**:
```
GET /ims/case/v1p1/CFConcepts/{sourcedId}
```

**Get Item Type**:
```
GET /ims/case/v1p1/CFItemTypes/{sourcedId}
```

**Get License**:
```
GET /ims/case/v1p1/CFLicenses/{sourcedId}
```

**Get Association Grouping**:
```
GET /ims/case/v1p1/CFAssociationGroupings/{sourcedId}
```

### Management API Endpoints (Create/Update/Delete)

All endpoints require authentication and are prefixed with `/management/tenants/{tenantId}/`

**Note**: These are NOT part of the CASE standard specification - they are extensions for management.

#### Framework Management

**List Frameworks** (for a tenant):
```
GET /management/tenants/{tenantId}/frameworks
```
Returns: List of framework metadata

#### Document Management

**Update Document**:
```
PUT /management/tenants/{tenantId}/CFDocuments/{id}
Body: { CFDocument: {...} }
Query: ?caseVersion=1.1 (optional)
```

**Delete Document**:
```
DELETE /management/tenants/{tenantId}/CFDocuments/{id}
Query: ?caseVersion=1.1 (optional)
```

#### Item Management

**Update Item**:
```
PUT /management/tenants/{tenantId}/CFItems/{id}
Body: { CFItem: {...} }
Query: ?caseVersion=1.1 (optional)
```

**Delete Item**:
```
DELETE /management/tenants/{tenantId}/CFItems/{id}
Query: ?caseVersion=1.1 (optional)
```

#### Association Management

**Update Association**:
```
PUT /management/tenants/{tenantId}/CFAssociations/{id}
Body: { CFAssociation: {...} }
Query: ?caseVersion=1.1 (optional)
```

**Delete Association**:
```
DELETE /management/tenants/{tenantId}/CFAssociations/{id}
Query: ?caseVersion=1.1 (optional)
```

---

## Example React Component Flow

```javascript
// 1. Initial Load
async function loadFramework(frameworkId) {
  // Get complete package
  const response = await fetch(
    `/ims/case/v1p1/CFPackages/${frameworkId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const { CFPackage } = await response.json();
  
  return {
    document: CFPackage.CFDocument,
    items: CFPackage.CFItems,
    associations: CFPackage.CFAssociations,
    rubrics: CFPackage.CFRubrics,
    definitions: CFPackage.CFDefinitions
  };
}

// 2. Build Item Hierarchy
function buildItemTree(items) {
  // Group items by parentId or use hierarchical structure
  // Return tree structure for rendering
}

// 3. Update Item
async function updateItem(tenantId, itemId, updatedItem) {
  await fetch(
    `/management/tenants/${tenantId}/CFItems/${itemId}?caseVersion=1.1`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ CFItem: updatedItem })
    }
  );
  // Reload framework or refresh specific item
}
```

---

## Key Differences Summary

| Resource | Purpose | Contains | When to Use |
|----------|---------|----------|-------------|
| **CFPackage** | Complete bundle | Everything | Initial load, export/import |
| **CFDocument** | Framework root | Metadata only | List frameworks, show header |
| **CFItem** | Individual competency | One learning objective | Display competencies, edit one item |
| **CFAssociation** | Relationships | Link between items | Show connections, prerequisite maps |
| **CFRubric** | Assessment criteria | Grading matrix | Show how to assess competency |
| **CFSubject** | Subject area | Subject metadata | Filter by subject |
| **CFConcept** | Vocabulary term | Concept definition | Glossary, semantic search |
| **CFItemType** | Item category | Type definition | Filter/group by type |

---

## Tips for LLM Developers

1. **Start with Discovery**: Always fetch the OpenAPI spec first to understand available endpoints
2. **Use CFPackage for Initial Load**: It's the most efficient way to get everything
3. **Cache Data**: Store the CFPackage data in React state/context to avoid repeated calls
4. **Handle Hierarchies**: CFItems can have parent-child relationships - you'll need to build a tree structure
5. **Associations are References**: Associations reference item IDs - resolve them to actual items for display
6. **Rubrics are Linked**: Rubrics reference CFItem IDs - match them up when displaying
7. **Use Management API for Updates**: Public API is read-only - use `/management/` endpoints for changes
8. **Tenant Scoping**: All management operations require a tenantId that matches your authenticated tenant
9. **Version Handling**: Some endpoints support `?caseVersion=1.0` or `1.1` query parameter
10. **Error Handling**: All endpoints return standard error responses - check status codes and error messages

---

## Additional Resources

- **OpenAPI Spec**: `GET /ims/case/v1p1/discovery/imscasev1p1_openapi3_v1p0.json` - Complete API documentation
- **OAuth Discovery**: `GET /.well-known/oauth-authorization-server` - OAuth configuration
- **Health Check**: `GET /health` - Server status













