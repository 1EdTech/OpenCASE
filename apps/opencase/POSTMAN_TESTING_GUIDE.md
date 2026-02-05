# CASE v1p1 API - Postman Testing Guide

## Base Configuration

- **Base URL:** `http://localhost:8080` (default port, configurable via `PORT` env var)
- **Keycloak URL:** `http://localhost:8081`
- **Keycloak Realm:** `opencase`
- **Tenant client id convention:** `tenant-<tenantId>` (default prefix: `tenant-`)
- **Example Tenant:** `demo`
- **Demo Document ID:** `c739fefe-4f94-4a75-9203-e8621a7c2a1a`
- **Demo Item ID:** `demo-item-1`
- **Demo Association ID:** `demo-assoc-1`

---

## 1. Keycloak Token Endpoint (Get Access Token)

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:8081/realms/opencase/protocol/openid-connect/token`
- **Headers:**
  - `Content-Type: application/x-www-form-urlencoded`
- **Body (x-www-form-urlencoded)**:
  - `grant_type=password` (dev convenience)
  - `client_id=tenant-demo`
  - `username=admin@demo.local`
  - `password=<temporary password returned by POST /management/tenants>`

**Note on scopes vs roles:**

- In Keycloak, the request parameter `scope` is for OIDC scopes like `openid`/`profile`/`email`.
- Authorization in OpenCASE (e.g. `case.admin`) is granted via **Keycloak client roles** (e.g. `resource_access["tenant-system"].roles` contains `case.admin`), not by requesting `scope=case.admin`.

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Postman Setup:**
1. Create environment variable: `access_token`
2. In Tests tab, add:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.access_token);
}
```

---

## 2. Service Discovery Endpoint (No Authentication Required)

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/discovery/imscasev1p1_openapi3_v1p0.json`
- **Headers:** None required

**Expected Response:**
- **Status:** `200 OK`
- **Content-Type:** `application/json`
- **Body:** OpenAPI 3.0 specification JSON

---

## 3. Get All CFDocuments (with Pagination, Sorting, Filtering)

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFDocuments`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Query Parameters (all optional):**
  - `limit` - Maximum number of records (e.g., `5`)
  - `offset` - Number of first record (e.g., `0`)
  - `sort` - Sort field (e.g., `title`, `lastChangeDateTime`)
  - `orderBy` - Sort order: `asc` or `desc`
  - `filter` - Filter string (searches title, sourcedId, subject)
  - `fields` - Comma-separated field list (e.g., `title,identifier,language`)

**Example Requests:**
```
GET /ims/case/v1p1/CFDocuments
GET /ims/case/v1p1/CFDocuments?limit=10&offset=0
GET /ims/case/v1p1/CFDocuments?sort=title&orderBy=asc
GET /ims/case/v1p1/CFDocuments?filter=Mathematics
GET /ims/case/v1p1/CFDocuments?fields=identifier,title,language
GET /ims/case/v1p1/CFDocuments?limit=5&sort=lastChangeDateTime&orderBy=desc&filter=Demo
```

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFDocumentSet": {
    "CFDocuments": [
      {
        "identifier": "c739fefe-4f94-4a75-9203-e8621a7c2a1a",
        "uri": "/ims/case/v1p1/CFDocuments/c739fefe-4f94-4a75-9203-e8621a7c2a1a",
        "title": "Demo Framework",
        "language": "en",
        "frameworkType": "curriculum",
        "subject": "Mathematics",
        "version": "1.0",
        "lastChangeDateTime": "2025-01-01T12:00:00.000Z",
        "CFPackageURI": {
          "title": "CFPackage",
          "identifier": "c739fefe-4f94-4a75-9203-e8621a7c2a1a",
          "uri": "/ims/case/v1p1/CFPackages/c739fefe-4f94-4a75-9203-e8621a7c2a1a"
        }
      }
    ]
  },
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

## 4. Get CFDocument by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFDocuments/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `c739fefe-4f94-4a75-9203-e8621a7c2a1a`

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFDocument": {
    "identifier": "c739fefe-4f94-4a75-9203-e8621a7c2a1a",
    "uri": "/ims/case/v1p1/CFDocuments/c739fefe-4f94-4a75-9203-e8621a7c2a1a",
    "creator": "Unknown",
    "title": "Demo Framework",
    "description": "Demo CASE framework created via admin API",
    "subject": "Mathematics",
    "language": "en",
    "frameworkType": "curriculum",
    "version": "1.0",
    "lastChangeDateTime": "2025-01-01T12:00:00.000Z",
    "adoptionStatus": "Draft",
    "CFPackageURI": {
      "title": "CFPackage",
      "identifier": "c739fefe-4f94-4a75-9203-e8621a7c2a1a",
      "uri": "/ims/case/v1p1/CFPackages/c739fefe-4f94-4a75-9203-e8621a7c2a1a"
    }
  }
}
```

---

## 5. Get CFPackage by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFPackages/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `c739fefe-4f94-4a75-9203-e8621a7c2a1a`

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFPackage": {
    "CFDocument": { ... },
    "CFItems": [ ... ],
    "CFAssociations": [ ... ],
    "CFRubrics": [],
    "CFDefinitions": { ... }
  }
}
```

---

## 6. Get CFItem by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFItems/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `demo-item-1` (Note: This is not a UUID in demo data, but endpoint expects UUID format)

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFItem": {
    "identifier": "demo-item-1",
    "uri": "/ims/case/v1p1/CFItems/demo-item-1",
    "fullStatement": "Learner can add two single-digit numbers.",
    "lastChangeDateTime": "2025-12-31T17:17:32.829Z",
    "CFDocumentURI": {
      "title": "Document",
      "identifier": "c739fefe-4f94-4a75-9203-e8621a7c2a1a",
      "uri": "http://example.org/ims/case/v1p1/CFDocuments/c739fefe-4f94-4a75-9203-e8621a7c2a1a"
    },
    "humanCodingScheme": "MATH.1",
    "language": "en"
  }
}
```

---

## 7. Get CFItem Associations

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFItemAssociations/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `demo-item-1` (Item ID)

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFAssociationSet": {
    "CFAssociations": [
      {
        "identifier": "demo-assoc-1",
        "uri": "/ims/case/v1p1/CFAssociations/demo-assoc-1",
        "associationType": "isChildOf",
        "originNodeURI": { ... },
        "destinationNodeURI": { ... },
        "lastChangeDateTime": "2025-12-31T17:17:32.829Z"
      }
    ]
  }
}
```

---

## 8. Get CFAssociation by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFAssociations/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `demo-assoc-1`

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFAssociation": {
    "identifier": "demo-assoc-1",
    "uri": "/ims/case/v1p1/CFAssociations/demo-assoc-1",
    "associationType": "isChildOf",
    "originNodeURI": {
      "title": "demo-item-1",
      "identifier": "demo-item-1",
      "uri": "/ims/case/v1p1/CFItems/demo-item-1"
    },
    "destinationNodeURI": {
      "title": "demo-item-1",
      "identifier": "demo-item-1",
      "uri": "/ims/case/v1p1/CFItems/demo-item-1"
    },
    "lastChangeDateTime": "2025-12-31T17:17:32.829Z",
    "sequenceNumber": 1
  }
}
```

---

## 9. Get CFRubric by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFRubrics/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `{rubric-uuid}` (UUID of the rubric)

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFRubric": {
    "identifier": "{rubric-uuid}",
    "uri": "/ims/case/v1p1/CFRubrics/{rubric-uuid}",
    "title": "Rubric Title",
    "description": "Rubric Description",
    "lastChangeDateTime": "2024-01-01T00:00:00.000Z",
    "CFRubricCriteria": [ ... ]
  }
}
```

**Note:** Demo data has empty rubrics array, so you may need to add a rubric first via admin API.

---

## 10. Get CFSubject by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFSubjects/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `{subject-uuid}` (UUID from CFDefinitions.CFSubjects)

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFSubject": {
    "identifier": "{subject-uuid}",
    "uri": "/ims/case/v1p1/CFSubjects/{subject-uuid}",
    "title": "Mathematics",
    "hierarchyCode": "01",
    "description": "Subject description",
    "lastChangeDateTime": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 11. Get CFConcept by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFConcepts/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `{concept-uuid}` (UUID from CFDefinitions.CFConcepts)

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFConcept": {
    "identifier": "{concept-uuid}",
    "uri": "/ims/case/v1p1/CFConcepts/{concept-uuid}",
    "title": "Concept Title",
    "hierarchyCode": "01.01",
    "description": "Concept description",
    "keywords": "keyword1, keyword2",
    "lastChangeDateTime": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 12. Get CFAssociationGrouping by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFAssociationGroupings/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `{grouping-uuid}` (UUID from CFDefinitions.CFAssociationGroupings)

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFAssociationGrouping": {
    "identifier": "{grouping-uuid}",
    "uri": "/ims/case/v1p1/CFAssociationGroupings/{grouping-uuid}",
    "title": "Grouping Title",
    "description": "Grouping description",
    "lastChangeDateTime": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 13. Get CFItemType by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFItemTypes/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `{itemtype-uuid}` (UUID from CFDefinitions.CFItemTypes)

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFItemType": {
    "identifier": "{itemtype-uuid}",
    "uri": "/ims/case/v1p1/CFItemTypes/{itemtype-uuid}",
    "title": "Item Type Title",
    "description": "Item type description",
    "hierarchyCode": "01",
    "lastChangeDateTime": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 14. Get CFLicense by ID

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:8080/ims/case/v1p1/CFLicenses/{sourcedId}`
- **Headers:**
  - `Authorization: Bearer {{access_token}}`
- **Path Parameters:**
  - `sourcedId`: `{license-uuid}` (UUID from CFDefinitions.CFLicenses)

**Expected Response:**
- **Status:** `200 OK`
- **Body:**
```json
{
  "CFLicense": {
    "identifier": "{license-uuid}",
    "uri": "/ims/case/v1p1/CFLicenses/{license-uuid}",
    "title": "License Title",
    "description": "License description",
    "licenseText": "Full license text here...",
    "lastChangeDateTime": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Error Responses

All endpoints return standardized error responses using `imsx_StatusInfoDType`:

### 400 Bad Request (Invalid Selection Field)
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "An invalid selection field was supplied...",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "invalid_selection_field",
        "imsx_codeMinorFieldValue": "invalid_selection_field"
      }
    ]
  }
}
```

### 401 Unauthorized
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "The request was not correctly authorised.",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "unauthorisedrequest",
        "imsx_codeMinorFieldValue": "unauthorised_request"
      }
    ]
  }
}
```

### 403 Forbidden
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "Server refuses to take action.",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "forbidden",
        "imsx_codeMinorFieldValue": "forbidden"
      }
    ]
  }
}
```

### 404 Not Found
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "The requested resource was not found.",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "unknownobject",
        "imsx_codeMinorFieldValue": "unknownobject"
      }
    ]
  }
}
```

### 404 Invalid UUID
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "The supplied identifier is not a valid UUID.",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "invalid_uuid",
        "imsx_codeMinorFieldValue": "invalid_uuid"
      }
    ]
  }
}
```

### 429 Too Many Requests
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "The server is receiving too many requests.",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "server_busy",
        "imsx_codeMinorFieldValue": "server_busy"
      }
    ]
  }
}
```

### 500 Internal Server Error
```json
{
  "imsx_codeMajor": "failure",
  "imsx_severity": "error",
  "imsx_description": "An internal server error occurred.",
  "imsx_codeMinor": {
    "imsx_codeMinorField": [
      {
        "imsx_codeMinorFieldName": "internal_server_error",
        "imsx_codeMinorFieldValue": "internal_server_error"
      }
    ]
  }
}
```

---

## Postman Collection Setup

### Environment Variables

Create a Postman environment with:
- `base_url`: `http://localhost:8080`
- `access_token`: (leave empty, will be set by script)
- `document_id`: `c739fefe-4f94-4a75-9203-e8621a7c2a1a`
- `item_id`: `demo-item-1`
- `association_id`: `demo-assoc-1`

### Pre-request Script (Collection Level)

```javascript
// Auto-fetch token if not set or expired
if (!pm.environment.get("access_token")) {
    pm.sendRequest({
        url: "http://localhost:8081/realms/opencase/protocol/openid-connect/token",
        method: "POST",
        header: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: {
            mode: "urlencoded",
            urlencoded: [
                { key: "grant_type", value: "password" },
                { key: "client_id", value: "tenant-demo" },
                { key: "username", value: "admin@demo.local" },
                { key: "password", value: "<temporary password>" }
            ]
        }
    }, function (err, res) {
        if (res.json().access_token) {
            pm.environment.set("access_token", res.json().access_token);
        }
    });
}
```

### Request Templates

Use `{{base_url}}` and `{{access_token}}` in all requests:

```
GET {{base_url}}/ims/case/v1p1/CFDocuments/{{document_id}}
Authorization: Bearer {{access_token}}
```

---

## Quick Test Sequence

1. **Get Token:** `POST Keycloak /protocol/openid-connect/token` for your tenant client (e.g. `tenant-demo`)
2. **Discovery:** `GET /ims/case/v1p1/discovery/imscasev1p1_openapi3_v1p0.json` (no auth)
3. **Get All Documents:** `GET /ims/case/v1p1/CFDocuments` (with auth)
4. **Get Document:** `GET /ims/case/v1p1/CFDocuments/c739fefe-4f94-4a75-9203-e8621a7c2a1a`
5. **Get Package:** `GET /ims/case/v1p1/CFPackages/c739fefe-4f94-4a75-9203-e8621a7c2a1a`
6. **Get Item:** `GET /ims/case/v1p1/CFItems/demo-item-1`
7. **Get Item Associations:** `GET /ims/case/v1p1/CFItemAssociations/demo-item-1`
8. **Get Association:** `GET /ims/case/v1p1/CFAssociations/demo-assoc-1`

---

## Notes

- **UUID Validation:** All endpoints validate UUID format. Non-UUID identifiers will return 404.
- **Demo Data:** The demo data uses non-UUID identifiers for items (`demo-item-1`) and associations (`demo-assoc-1`). These will return 404 unless you update them to UUID format or modify the validation.
- **Definitions:** CFSubjects, CFConcepts, CFLicenses, CFItemTypes, and CFAssociationGroupings are stored in `CFDefinitions` within packages. You may need to check the CFPackage response first to get their UUIDs.
- **Authentication:** All endpoints except Discovery require Bearer token authentication (tokens are issued by Keycloak in this deployment).













