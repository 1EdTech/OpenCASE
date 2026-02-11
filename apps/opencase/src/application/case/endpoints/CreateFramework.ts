import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFRubric } from '../../../domain/case/entities/CFRubric'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface CreateFrameworkCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  payload: {
    CFDocument: any
    CFItems?: any[]
    CFAssociations?: any[]
    CFRubrics?: any[]
    CFDefinitions?: any
    extensions?: any
  }
}

export type CreateFrameworkResult =
  | { status: 'created', docId: string }
  | { status: 'published', docId: string }
  | { status: 'unchanged', docId: string }

function stableStringify (value: any): string {
  const seen = new WeakSet<object>()
  const normalize = (v: any): any => {
    if (v === null || v === undefined) return v
    if (typeof v !== 'object') return v

    if (Array.isArray(v)) {
      return v.map(normalize)
    }

    if (seen.has(v)) return v
    seen.add(v)

    const out: any = {}
    for (const k of Object.keys(v).sort()) {
      out[k] = normalize(v[k])
    }
    return out
  }

  return JSON.stringify(normalize(value))
}

function sortById (arr: any[]): any[] {
  const getId = (o: any): string => (o?.sourcedId ?? o?.identifier ?? o?.id ?? '').toString()
  return [...arr].sort((a, b) => getId(a).localeCompare(getId(b)))
}

/**
 * Prepares payload for validation by removing fields that are only present in GET responses
 * but not allowed in POST requests according to the official CFPackage schema.
 * 
 * - CFPackageURI: Added to CFDocument in GET responses, but not in CFPackage POST
 * - CFDocumentURI: Added to CFItems and CFAssociations in GET responses, but not in CFPackage POST
 */
function preparePayloadForValidation (payload: any): any {
  const cleaned = { ...payload }
  
  // Remove CFPackageURI from CFDocument (only in GET responses)
  if (cleaned.CFDocument) {
    const { CFPackageURI, ...documentWithoutPackageURI } = cleaned.CFDocument
    cleaned.CFDocument = documentWithoutPackageURI
  }
  
  // Remove CFDocumentURI from CFItems (only in GET responses)
  if (cleaned.CFItems && Array.isArray(cleaned.CFItems)) {
    cleaned.CFItems = cleaned.CFItems.map((item: any) => {
      const { CFDocumentURI, ...itemWithoutDocumentURI } = item
      return itemWithoutDocumentURI
    })
  }
  
  // Remove CFDocumentURI from CFAssociations (only in GET responses)
  if (cleaned.CFAssociations && Array.isArray(cleaned.CFAssociations)) {
    cleaned.CFAssociations = cleaned.CFAssociations.map((assoc: any) => {
      const { CFDocumentURI, ...assocWithoutDocumentURI } = assoc
      return assocWithoutDocumentURI
    })
  }
  
  return cleaned
}

export class CreateFramework {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly validator?: JsonSchemaValidator,
    private readonly store?: FileFrameworkStore
  ) {}
  
  /**
   * Prepares payload for validation by removing fields that are only present in GET responses
   * but not allowed in POST requests according to the official CFPackage schema.
   */
  private preparePayloadForValidation (payload: any): any {
    return preparePayloadForValidation(payload)
  }

  async execute (cmd: CreateFrameworkCommand): Promise<CreateFrameworkResult> {
    const { tenantId, caseVersion, payload } = cmd

    // Validate against JSON schema if validator is available
    // Payload should match CFPackage format (CFDocument, CFItems, etc.)
    // Note: CFPackageURI and CFDocumentURI are added in GET responses but NOT allowed in POST
    if (this.validator) {
      const schemaName = caseVersion === '1.1' ? 'case-v1p1-cfpackage' : 'case-v1p0-cfpackage'
      
      // Check if schema is registered
      if (!this.validator.hasSchema(schemaName)) {
        const registeredSchemas = this.validator.getRegisteredSchemas()
        throw new Error(
          `Schema '${schemaName}' is not available. ` +
          `Registered schemas: ${registeredSchemas.length > 0 ? registeredSchemas.join(', ') : 'none'}. ` +
          `Schema loading may have failed during startup. Check server logs for details.`
        )
      }
      
      // Prepare payload for validation by removing fields that are only in GET responses
      const validationPayload = this.preparePayloadForValidation(payload)
      
      try {
        this.validator.validate(schemaName, validationPayload)
      } catch (error: any) {
        const validationError: any = new Error(`Schema validation failed: ${error.message}`)
        validationError.details = error.details || error.errors
        throw validationError
      }
    }

    // If the framework was previously imported (has sourcePackageURI in metadata),
    // mark it as modified from source on subsequent saves from the editor.
    let cfDocPayload = payload.CFDocument
    if (this.store) {
      const docId = (cfDocPayload.sourcedId ?? cfDocPayload.identifier) as string | undefined
      if (docId) {
        // Check both CASE versions for existing metadata
        const existingMeta = this.store.getDocumentMetadata(tenantId, caseVersion, docId)
          ?? this.store.getDocumentMetadata(tenantId, caseVersion === '1.0' ? '1.1' : '1.0', docId)
        if (existingMeta?.sourcePackageURI) {
          const existingExt = cfDocPayload.extensions ?? {}
          const existingOpencase = (existingExt['ext:opencase'] && typeof existingExt['ext:opencase'] === 'object')
            ? existingExt['ext:opencase']
            : {}
          cfDocPayload = {
            ...cfDocPayload,
            extensions: {
              ...existingExt,
              'ext:opencase': {
                ...existingOpencase,
                sourcePackageURI: existingMeta.sourcePackageURI,
                isModifiedFromSource: true,
              }
            }
          }
        }
      }
    }

    // Extract from CFPackage format and create domain entities
    const document = CFDocument.fromRaw(tenantId, caseVersion, cfDocPayload)
    const docId = document.sourcedId
    const docJSON = document.toJSON()
    const docURI = docJSON.uri
    
    const items = (payload.CFItems ?? []).map(i =>
      CFItem.fromRaw(tenantId, caseVersion, i, docId, docURI)
    )
    const associations = (payload.CFAssociations ?? []).map(a =>
      CFAssociation.fromRaw(tenantId, caseVersion, a)
    )
    const rubrics = (payload.CFRubrics ?? []).map(r =>
      CFRubric.fromRaw(tenantId, caseVersion, r)
    )
    const definitions = payload.CFDefinitions ?? null

    const pkg = new CFPackage({ document, items, associations, rubrics, definitions })

    // Idempotency: if this doc already exists and the resulting stored bundle would be identical,
    // don't create a new version.
    // Compare using CFPackage format (CFDocument, CFItems, etc.) to match validation format
    const existing = await this.pkgRepo.load(tenantId, caseVersion, docId)
    if (existing) {
      const existingBundle = {
        CFDocument: existing.document.toJSON(),
        CFItems: sortById(existing.items.map(i => i.toJSON())),
        CFAssociations: sortById(existing.associations.map(a => a.toJSON())),
        CFRubrics: sortById((existing.rubrics ?? []).map(r => r.toJSON())),
        CFDefinitions: existing.definitions ?? null
      }
      const newBundle = {
        CFDocument: docJSON,
        CFItems: sortById(items.map(i => i.toJSON())),
        CFAssociations: sortById(associations.map(a => a.toJSON())),
        CFRubrics: sortById(rubrics.map(r => r.toJSON())),
        CFDefinitions: definitions
      }

      if (stableStringify(existingBundle) === stableStringify(newBundle)) {
        return { status: 'unchanged', docId }
      }

      await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg)
      return { status: 'published', docId }
    }

    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg)
    return { status: 'created', docId }
  }
}

