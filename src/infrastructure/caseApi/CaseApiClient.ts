import type { CFPackage } from '@/domain/case/types'
import type { HttpClient } from './http'

export type OpenCaseCfPackageResponse = { CFPackage: CFPackage }

export type OpenCaseManagementCfPackageSummary = {
  sourcedId?: string
  identifier?: string
  title?: string
  uri?: string
  caseVersion?: string
  version?: string
  lastChangeDateTime?: string
  [k: string]: unknown
}

export class CaseApiClient {
  constructor(private readonly _http: HttpClient) {}

  async lookupTenantByEmail(params: { email: string }): Promise<{ tenantId?: string } | null> {
    const email = params.email.trim()
    if (!email) return null
    const res = (await this._http.get(`/public/tenant-lookup?email=${encodeURIComponent(email)}`)) as unknown
    if (!res || typeof res !== 'object') return null
    const any = res as { tenantId?: unknown }
    if (typeof any.tenantId === 'string' && any.tenantId.trim()) return { tenantId: any.tenantId.trim() }
    return {}
  }

  async listManagementCfPackages(params: { tenantId: string; caseVersion?: '1.0' | '1.1' }): Promise<OpenCaseManagementCfPackageSummary[]> {
    const caseVersion = params.caseVersion ?? '1.1'
    const res = (await this._http.get(`/management/tenants/${encodeURIComponent(params.tenantId)}/CFPackages?caseVersion=${encodeURIComponent(caseVersion)}`)) as unknown

    // Be tolerant of shape differences: `{ CFPackages: [...] }` or `[...]`.
    if (Array.isArray(res)) return res as OpenCaseManagementCfPackageSummary[]
    if (res && typeof res === 'object' && 'CFPackages' in res) {
      const any = res as { CFPackages?: unknown }
      if (Array.isArray(any.CFPackages)) return any.CFPackages as OpenCaseManagementCfPackageSummary[]
    }
    return []
  }

  async getCfPackage(params: { docId: string; caseVersion?: 'v1p0' | 'v1p1' }): Promise<CFPackage> {
    const v = params.caseVersion ?? 'v1p1'
    const res = (await this._http.get(`/ims/case/${v}/CFPackages/${encodeURIComponent(params.docId)}`)) as unknown
    if (res && typeof res === 'object' && 'CFPackage' in res) {
      return (res as OpenCaseCfPackageResponse).CFPackage
    }
    throw new Error('Unexpected CFPackage response shape')
  }
}

