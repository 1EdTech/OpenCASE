import type { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export class ReadOnlyDocumentError extends Error {
  constructor (docId: string) {
    super(`Document ${docId} is read-only and cannot be modified`)
    this.name = 'ReadOnlyDocumentError'
  }
}

export function assertDocumentMutable (
  store: FileFrameworkStore,
  tenantId: TenantId,
  caseVersion: CaseVersion,
  docId: string
): void {
  const meta = store.getDocumentMetadata(tenantId, caseVersion, docId)
  if (meta?.readOnly === true) {
    throw new ReadOnlyDocumentError(docId)
  }
}
