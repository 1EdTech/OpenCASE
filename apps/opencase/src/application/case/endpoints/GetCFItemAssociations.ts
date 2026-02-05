import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFItemAssociationsQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFItemAssociations {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFItemAssociationsQuery) {
    // logger.info({ query }, 'Executing GetCFItemAssociations')

    // Find which document contains this item
    const docId = this.store.getDocumentIdForItem(query.tenantId, query.caseVersion, query.sourcedId)
    if (!docId) return null

    // Load the package containing this item
    const pkg = await this.pkgRepo.load(query.tenantId, query.caseVersion, docId)
    if (!pkg) return null

    // Verify the item exists
    const item = pkg.items.find(i => i.sourcedId === query.sourcedId)
    if (!item) return null

    // Find all associations where this item is the origin or destination
    const associations = pkg.associations.filter(a => {
      const assocJSON = a.toJSON()
      const originURI = assocJSON.originNodeURI
      const destURI = assocJSON.destinationNodeURI
      const originId = typeof originURI === 'string' ? originURI : originURI?.identifier
      const destId = typeof destURI === 'string' ? destURI : destURI?.identifier
      return originId === query.sourcedId || destId === query.sourcedId
    })

    return {
      CFAssociationSet: {
        CFAssociations: associations.map(a => a.toJSON())
      }
    }
  }
}

