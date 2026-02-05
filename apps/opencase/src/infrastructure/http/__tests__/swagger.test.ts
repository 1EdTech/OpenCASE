import { generateOpenApiFromJSDoc } from '../swagger'

describe('swagger-jsdoc discovery generation', () => {
  it('generates v1p1 spec containing annotated routes', () => {
    const spec = generateOpenApiFromJSDoc({
      baseUrl: 'https://example.com',
      caseVersion: '1.1',
      version: '1.0.0'
    })

    // Global auth requirement should be present
    expect(spec.security).toEqual([{ BearerAuth: [] }])

    expect(spec.paths['/ims/case/v1p1/CFDocuments']).toBeDefined()
    expect(spec.paths['/ims/case/v1p0/CFDocuments']).toBeUndefined()

    expect(spec.paths['/management/tenants/{tenantId}/CFPackages']).toBeDefined()
    expect(spec.paths['/management/tenants/{tenantId}/ims/case/v1p1/CFPackages']).toBeDefined()
    expect(spec.paths['/management/tenants/{tenantId}/ims/case/v1p1/CFPackages/{id}']).toBeDefined()

    // Legacy routes should not appear (no annotations and removed from runtime)
    expect(spec.paths['/management/tenants/{tenantId}/accounts']).toBeUndefined()
    expect(spec.paths['/management/tenants/{tenantId}/clients']).toBeUndefined()
  })

  it('generates v1p0 spec containing v1p0 public routes', () => {
    const spec = generateOpenApiFromJSDoc({
      baseUrl: 'https://example.com',
      caseVersion: '1.0',
      version: '1.0.0'
    })

    expect(spec.paths['/ims/case/v1p0/CFDocuments']).toBeDefined()
    expect(spec.paths['/ims/case/v1p1/CFDocuments']).toBeUndefined()
  })
})

