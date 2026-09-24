import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFAssociationQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
  /** When set, load data from this version's storage but serialize using caseVersion semantics. */
  loadVersion?: CaseVersion
}

export class GetCFAssociation {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFAssociationQuery) {
    //logger.info({ query }, 'Executing GetCFAssociation')

    // Use loadVersion for storage access if provided
    const storageVersion = query.loadVersion ?? query.caseVersion

    // Find which document contains this association
    const storageKey = this.store.getStorageKeyForAssociation(query.tenantId, storageVersion, query.sourcedId)
    if (!storageKey) return null

    // Load the package containing this association
    const pkg = await this.pkgRepo.load(query.tenantId, storageVersion, storageKey)
    if (!pkg) return null

    // Find the specific association
    const association = pkg.associations.find(a => a.sourcedId === query.sourcedId)
    if (!association) return null

    // Pass caseVersion to toJSON for correct field stripping when downconverting
    const serializeAs = query.loadVersion ? query.caseVersion : undefined
    return association.toJSON(serializeAs)
  }
}













