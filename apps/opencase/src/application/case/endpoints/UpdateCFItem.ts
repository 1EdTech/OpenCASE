import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'

export interface UpdateCFItemCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: string
  payload: any // CFItem JSON
}

export class UpdateCFItem {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore,
    private readonly validator?: JsonSchemaValidator
  ) {}

  async execute (cmd: UpdateCFItemCommand): Promise<void> {
    const { tenantId, caseVersion, sourcedId, payload } = cmd

    // Validate against JSON schema if validator is available
    if (this.validator) {
      try {
        const schemaName = caseVersion === '1.1' ? 'case-v1p1-cfitem' : 'case-v1p0-cfitem'
        this.validator.validate(schemaName, payload)
      } catch (error: any) {
        throw new Error(`Schema validation failed: ${error.message}`)
      }
    }

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

    // Ensure sourcedId matches
    const itemId = payload.sourcedId ?? payload.identifier
    if (itemId !== sourcedId) {
      throw new Error('sourcedId in payload must match the URL parameter')
    }

    const docJSON = existingPkg.document.toJSON()
    const docURI = docJSON.uri

    // Update the specific item
    const updatedItem = CFItem.fromRaw(tenantId, caseVersion, payload, docId, docURI)
    
    // Replace the item in the items array
    const items = existingPkg.items.map(i => 
      i.sourcedId === sourcedId ? updatedItem : i
    )

    // Keep existing document, associations, rubrics, and definitions
    const updatedPkg = new CFPackage({
      document: existingPkg.document,
      items,
      associations: existingPkg.associations,
      rubrics: existingPkg.rubrics,
      definitions: existingPkg.definitions
    })

    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, updatedPkg)
  }
}

