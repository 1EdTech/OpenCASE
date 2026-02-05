import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'

export interface UpdateCFDocumentCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: string
  payload: any // CFDocument JSON
}

export class UpdateCFDocument {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly validator?: JsonSchemaValidator
  ) {}

  async execute (cmd: UpdateCFDocumentCommand): Promise<void> {
    const { tenantId, caseVersion, sourcedId, payload } = cmd

    // Validate against JSON schema if validator is available
    if (this.validator) {
      try {
        const schemaName = caseVersion === '1.1' ? 'case-v1p1-cfdocument' : 'case-v1p0-cfdocument'
        this.validator.validate(schemaName, payload)
      } catch (error: any) {
        throw new Error(`Schema validation failed: ${error.message}`)
      }
    }

    // Load existing package
    const existingPkg = await this.pkgRepo.load(tenantId, caseVersion, sourcedId)
    if (!existingPkg) {
      throw new Error(`CFDocument with sourcedId ${sourcedId} not found`)
    }

    // Handle adoptionStatus changes - auto-set statusEndDate when archiving
    const currentStatus = existingPkg.document.toJSON().adoptionStatus
    const newStatus = payload.adoptionStatus
    const isArchiving = (newStatus === 'Retired' || newStatus === 'Deprecated') && 
                        (currentStatus !== 'Retired' && currentStatus !== 'Deprecated')
    const isUnarchiving = (currentStatus === 'Retired' || currentStatus === 'Deprecated') && 
                          (newStatus !== 'Retired' && newStatus !== 'Deprecated' && newStatus !== undefined)

    // Auto-set statusEndDate when archiving (if not already set)
    if (isArchiving && !payload.statusEndDate) {
      const today = new Date().toISOString().split('T')[0] // ISO date format (YYYY-MM-DD)
      payload.statusEndDate = today
    }

    // Clear statusEndDate when unarchiving
    if (isUnarchiving) {
      delete payload.statusEndDate
    }

    // Update lastChangeDateTime when status changes
    if (currentStatus !== newStatus) {
      payload.lastChangeDateTime = new Date().toISOString()
    }

    // Create updated document from payload
    const updatedDocument = CFDocument.fromRaw(tenantId, caseVersion, payload)
    
    // Ensure sourcedId matches
    if (updatedDocument.sourcedId !== sourcedId) {
      throw new Error('sourcedId in payload must match the URL parameter')
    }

    const docId = updatedDocument.sourcedId
    const docJSON = updatedDocument.toJSON()
    const docURI = docJSON.uri

    // Update items with new document URI if needed
    const items = existingPkg.items.map(i => {
      const itemJSON = i.toJSON()
      // Update CFDocumentURI to point to updated document
      if (itemJSON.CFDocumentURI) {
        itemJSON.CFDocumentURI.uri = docURI
        itemJSON.CFDocumentURI.identifier = docId
      }
      return CFItem.fromRaw(tenantId, caseVersion, itemJSON, docId, docURI)
    })

    // Keep existing associations, rubrics, and definitions
    const associations = existingPkg.associations
    const rubrics = existingPkg.rubrics
    const definitions = existingPkg.definitions

    const updatedPkg = new CFPackage({
      document: updatedDocument,
      items,
      associations,
      rubrics,
      definitions
    })

    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, updatedPkg)
  }
}

