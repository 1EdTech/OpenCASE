import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface DeleteCFItemCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: string
}

export class DeleteCFItem {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (cmd: DeleteCFItemCommand): Promise<void> {
    const { tenantId, caseVersion, sourcedId } = cmd

    // Find which document this item belongs to
    const docId = this.store.getDocumentIdForItem(tenantId, caseVersion, sourcedId)
    if (!docId) {
      throw new Error(`CFItem with sourcedId ${sourcedId} not found`)
    }

    // Load existing package
    const existingPkg = await this.pkgRepo.load(tenantId, caseVersion, docId)
    if (!existingPkg) {
      throw new Error(`CFPackage for document ${docId} not found`)
    }

    // Verify item exists
    const itemExists = existingPkg.items.some(i => i.sourcedId === sourcedId)
    if (!itemExists) {
      throw new Error(`CFItem with sourcedId ${sourcedId} not found`)
    }

    // Remove the item from the items array
    const items = existingPkg.items.filter(i => i.sourcedId !== sourcedId)

    // Also remove any associations that reference this item
    const associations = existingPkg.associations.filter(a => {
      const assocJSON = a.toJSON()
      return assocJSON.originNodeURI?.identifier !== sourcedId &&
             assocJSON.destinationNodeURI?.identifier !== sourcedId
    })

    // Remove from items index
    this.store.removeItemFromIndex(tenantId, caseVersion, sourcedId)

    // Remove associations that referenced this item from index
    const removedAssocIds = existingPkg.associations
      .filter(a => {
        const assocJSON = a.toJSON()
        return assocJSON.originNodeURI?.identifier === sourcedId ||
               assocJSON.destinationNodeURI?.identifier === sourcedId
      })
      .map(a => a.sourcedId)
    
    for (const assocId of removedAssocIds) {
      this.store.removeAssociationFromIndex(tenantId, caseVersion, assocId)
    }

    // Create updated package without the item
    const updatedPkg = new CFPackage({
      document: existingPkg.document,
      items,
      associations,
      rubrics: existingPkg.rubrics,
      definitions: existingPkg.definitions
    })

    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, updatedPkg)
  }
}

