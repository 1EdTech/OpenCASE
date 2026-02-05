import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface DeleteCFAssociationCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: string
}

export class DeleteCFAssociation {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (cmd: DeleteCFAssociationCommand): Promise<void> {
    const { tenantId, caseVersion, sourcedId } = cmd

    // Find which document this association belongs to
    const docId = this.store.getDocumentIdForAssociation(tenantId, caseVersion, sourcedId)
    if (!docId) {
      throw new Error(`CFAssociation with sourcedId ${sourcedId} not found`)
    }

    // Load existing package
    const existingPkg = await this.pkgRepo.load(tenantId, caseVersion, docId)
    if (!existingPkg) {
      throw new Error(`CFPackage for document ${docId} not found`)
    }

    // Verify association exists
    const assocExists = existingPkg.associations.some(a => a.sourcedId === sourcedId)
    if (!assocExists) {
      throw new Error(`CFAssociation with sourcedId ${sourcedId} not found`)
    }

    // Remove the association from the associations array
    const associations = existingPkg.associations.filter(a => a.sourcedId !== sourcedId)

    // Remove from associations index
    this.store.removeAssociationFromIndex(tenantId, caseVersion, sourcedId)

    // Create updated package without the association
    const updatedPkg = new CFPackage({
      document: existingPkg.document,
      items: existingPkg.items,
      associations,
      rubrics: existingPkg.rubrics,
      definitions: existingPkg.definitions
    })

    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, updatedPkg)
  }
}

