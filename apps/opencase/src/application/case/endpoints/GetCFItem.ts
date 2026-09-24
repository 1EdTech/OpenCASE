import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFItemQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
  /** When set, load data from this version's storage but serialize using caseVersion semantics. */
  loadVersion?: CaseVersion
}

export class GetCFItem {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFItemQuery) {
    logger.info({ query }, 'Executing GetCFItem')

    // Use loadVersion for storage access if provided
    const storageVersion = query.loadVersion ?? query.caseVersion

    // Find which document contains this item
    const storageKey = this.store.getStorageKeyForItem(query.tenantId, storageVersion, query.sourcedId)
    if (!storageKey) return null

    // Load the package containing this item
    const pkg = await this.pkgRepo.load(query.tenantId, storageVersion, storageKey)
    if (!pkg) return null

    // Find the specific item
    const item = pkg.items.find(i => i.sourcedId === query.sourcedId)
    if (!item) return null

    // Pass caseVersion to toJSON for correct field stripping when downconverting
    const serializeAs = query.loadVersion ? query.caseVersion : undefined
    return item.toJSON(serializeAs)
  }
}













