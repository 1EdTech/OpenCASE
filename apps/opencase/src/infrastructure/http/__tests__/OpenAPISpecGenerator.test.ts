import { OpenAPISpecGenerator } from '../OpenAPISpecGenerator'

describe('OpenAPISpecGenerator (discovery)', () => {
  it('generateV1p1 should reflect current runtime surface (no legacy accounts/clients, includes framework deletes)', () => {
    const spec = OpenAPISpecGenerator.generateV1p1({ baseUrl: 'https://example.com', version: '1.0.0' })

    // New/updated endpoints
    expect(spec.paths['/management/tenants/{tenantId}/CFPackages']).toBeDefined()
    expect(spec.paths['/management/tenants/{tenantId}/ims/case/v1p1/CFPackages']).toBeDefined()
    expect(spec.paths['/management/tenants/{tenantId}/ims/case/v1p1/CFPackages/import']).toBeDefined()
    expect(spec.paths['/management/tenants/{tenantId}/ims/case/v1p1/CFPackages/{id}']).toBeDefined()

    // Removed legacy endpoints (Keycloak is source of truth)
    expect(spec.paths['/management/tenants/{tenantId}/accounts']).toBeUndefined()
    expect(spec.paths['/management/tenants/{tenantId}/clients']).toBeUndefined()

    // Updated auth description
    expect(spec.components.securitySchemes.BearerAuth.description).toMatch(/OIDC|Keycloak/i)
  })

  it('generateV1p0 should rewrite public paths to v1p0 but keep management/admin paths', () => {
    const spec = OpenAPISpecGenerator.generateV1p0({ baseUrl: 'https://example.com', version: '1.0.0' })

    expect(spec.paths['/ims/case/v1p0/CFDocuments']).toBeDefined()
    expect(spec.paths['/ims/case/v1p1/CFDocuments']).toBeUndefined()

    // Management paths should still exist (and may include explicit v1p0/v1p1 segments)
    expect(spec.paths['/management/tenants/{tenantId}/CFPackages']).toBeDefined()
    expect(spec.paths['/management/tenants/{tenantId}/ims/case/v1p0/CFPackages/{id}']).toBeDefined()
    expect(spec.paths['/management/tenants/{tenantId}/ims/case/v1p1/CFPackages/{id}']).toBeDefined()
  })
})

