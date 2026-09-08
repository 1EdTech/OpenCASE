import type { CFPackage } from '../../../domain/case/entities/CFPackage'
import type { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers'

export interface CFPackageRepository {
  /** `storageKey` — never a public identifier; resolve via FileFrameworkStore first. */
  load: (tenantId: TenantId, version: CaseVersion, storageKey: SourcedId) => Promise<CFPackage | null>
  /** `storageKey` is required — always the storage location to write to. */
  saveNewVersion: (
    tenantId: TenantId,
    version: CaseVersion,
    pkg: CFPackage,
    storageKey: string
  ) => Promise<void>
}
