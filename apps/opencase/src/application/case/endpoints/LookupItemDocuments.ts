import { type CaseVersion, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type FileFrameworkStore, getOpenCaseArchived } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface LookupItemDocumentsQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  identifiers: string[]
}

export interface ItemDocumentRef {
  /** Public identifier of the CFDocument that holds the item */
  identifier: string
  title: string
}

/**
 * Resolves item identifiers to the hosted CFDocument that holds each one.
 *
 * Answered from the in-memory item and document indexes only — no package is
 * loaded — so it stays cheap for the hundreds of identifiers a large framework's
 * cross-framework associations can reference. Identifiers that aren't on this
 * server, or whose framework is archived, are left out of the result.
 */
export class LookupItemDocuments {
  constructor (private readonly store: FileFrameworkStore) {}

  execute (query: LookupItemDocumentsQuery): Record<string, ItemDocumentRef> {
    const result: Record<string, ItemDocumentRef> = {}
    for (const identifier of new Set(query.identifiers)) {
      const storageKey = this.store.getStorageKeyForItem(query.tenantId, query.caseVersion, identifier)
      if (!storageKey) continue
      const meta = this.store.getDocumentMetadata(query.tenantId, query.caseVersion, storageKey)
      if (!meta || getOpenCaseArchived(meta)) continue
      result[identifier] = { identifier: meta.sourcedId, title: meta.title }
    }
    return result
  }
}
