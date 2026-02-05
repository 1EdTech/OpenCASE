import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'

export interface UpdateCFAssociationCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: string
  payload: any // CFAssociation JSON
}

export class UpdateCFAssociation {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore,
    private readonly validator?: JsonSchemaValidator
  ) {}

  async execute (cmd: UpdateCFAssociationCommand): Promise<void> {
    const { tenantId, caseVersion, sourcedId, payload } = cmd

    // Validate against JSON schema if validator is available
    if (this.validator) {
      try {
        const schemaName = caseVersion === '1.1' ? 'case-v1p1-cfassociation' : 'case-v1p0-cfassociation'
        this.validator.validate(schemaName, payload)
      } catch (error: any) {
        throw new Error(`Schema validation failed: ${error.message}`)
      }
    }

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

    // Ensure sourcedId matches
    const assocId = payload.sourcedId ?? payload.identifier
    if (assocId !== sourcedId) {
      throw new Error('sourcedId in payload must match the URL parameter')
    }

    // Update the specific association
    const updatedAssociation = CFAssociation.fromRaw(tenantId, caseVersion, payload)
    
    // Replace the association in the associations array
    const associations = existingPkg.associations.map(a => 
      a.sourcedId === sourcedId ? updatedAssociation : a
    )

    // Keep existing document, items, rubrics, and definitions
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

