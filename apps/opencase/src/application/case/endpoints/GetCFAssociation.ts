import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFAssociationQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFAssociation {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFAssociationQuery) {
    //logger.info({ query }, 'Executing GetCFAssociation')

    // Find which document contains this association
    const docId = this.store.getDocumentIdForAssociation(query.tenantId, query.caseVersion, query.sourcedId)
    if (!docId) return null

    // Load the package containing this association
    const pkg = await this.pkgRepo.load(query.tenantId, query.caseVersion, docId)
    if (!pkg) return null

    // Find the specific association
    const association = pkg.associations.find(a => a.sourcedId === query.sourcedId)
    if (!association) return null

    return {
      CFAssociation: association.toJSON()
    }
  }
}













