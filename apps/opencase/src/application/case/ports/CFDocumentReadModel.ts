import type { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'

export interface CFDocumentSummary {
  sourcedId: string
  title: string
  language?: string
  frameworkType?: string
  subject?: string
  version?: string
  lastChangeDateTime: Date
}

export interface CFDocumentListQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  limit?: number
  offset?: number
  filter?: Record<string, unknown>
  sortBy?: keyof CFDocumentSummary
  sortOrder?: 'asc' | 'desc'
}

export interface CFDocumentReadModel {
  findById: (
    tenantId: TenantId,
    version: CaseVersion,
    id: string
  ) => Promise<CFDocumentSummary | null>
  list: (query: CFDocumentListQuery) => Promise<{ items: CFDocumentSummary[], total: number }>
}
