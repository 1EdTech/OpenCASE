import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface RestoreFrameworkCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: string
}

export class RestoreFramework {
  constructor (
    private readonly store: FileFrameworkStore
  ) {}

  async execute (cmd: RestoreFrameworkCommand): Promise<void> {
    const { tenantId, caseVersion, sourcedId } = cmd

    const storageKey = this.store.resolveStorageKey(tenantId, caseVersion, sourcedId)
    if (!storageKey || !this.store.isDocumentArchived(tenantId, caseVersion, storageKey)) {
      throw new Error(`CFDocument with sourcedId ${sourcedId} is not archived`)
    }

    this.store.setDocumentArchived(tenantId, caseVersion, storageKey, false)
    await this.store.writeIndexesToDisk(tenantId, caseVersion)
  }
}
