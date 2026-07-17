import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import type { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'

export interface SearchCachedFrameworkItemsQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  docId: string
  q?: string
  limit?: number
}

export interface CachedFrameworkItemSummary {
  identifier: string
  uri?: string
  fullStatement?: string
  abbreviatedStatement?: string
  humanCodingScheme?: string
  CFItemType?: string
}

export class SearchCachedFrameworkItems {
  constructor (private readonly store: FileFrameworkStore) {}

  async execute (query: SearchCachedFrameworkItemsQuery): Promise<{ items: CachedFrameworkItemSummary[] }> {
    const meta = this.store.getDocumentMetadata(query.tenantId, query.caseVersion, query.docId)
    if (!meta) {
      throw new Error(`Cached framework ${query.docId} not found`)
    }

    const items = await this.store.searchItemsInDocument(
      query.tenantId,
      query.caseVersion,
      query.docId,
      query.q ?? '',
      query.limit ?? 50
    )

    return { items }
  }
}
