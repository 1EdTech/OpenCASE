import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseApiClient } from '../../../infrastructure/http/CaseApiClient'
import { normalizeCfPackageData, type CFPackageResponse } from '../cfPackageShape'
import { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFRubric } from '../../../domain/case/entities/CFRubric'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { logger } from '../../../infrastructure/logging/Logger'
import type { ImportDocumentFlags } from '../types/ImportDocumentFlags'

export interface ImportFrameworkCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  endpointUrl?: string
  accessToken?: string
  cfPackage?: any
  validateSchema?: boolean
  schemaName?: string
  /** Optional import flags — omit for standard editable imports (default). */
  documentFlags?: ImportDocumentFlags
  /** Publisher CFPackage URL — used for provenance when importing from cfPackage JSON. */
  sourcePackageUri?: string
}

export interface ImportFrameworkResult {
  docId: string
  version: number
  validationWarnings?: string[]
}

/**
 * Merge or create the `ext:opencase` extension on a CFDocument payload,
 * setting sourcePackageURI and marking it as a pristine import.
 */
function injectSourceProvenance (
  docPayload: any,
  endpointUrl: string,
  documentFlags?: ImportDocumentFlags
): any {
  const existing = docPayload.extensions ?? {}
  const existingOpencase = (existing['ext:opencase'] && typeof existing['ext:opencase'] === 'object')
    ? existing['ext:opencase']
    : {}

  const extPatch: Record<string, unknown> = {
    ...existingOpencase,
    sourcePackageURI: endpointUrl,
    isModifiedFromSource: false,
    importedAt: new Date().toISOString(),
  }

  if (documentFlags?.readOnly === true) {
    extPatch.readOnly = true
  }
  if (documentFlags?.cgeFrameworkId) {
    extPatch.cgeFrameworkId = documentFlags.cgeFrameworkId
  }
  if (documentFlags?.linkedFromDocId) {
    extPatch.linkedFromDocId = documentFlags.linkedFromDocId
  }
  if (documentFlags?.cgeCachedAt) {
    extPatch.cgeCachedAt = documentFlags.cgeCachedAt
  }

  return {
    ...docPayload,
    extensions: {
      ...existing,
      'ext:opencase': extPatch
    }
  }
}

function applyDocumentFlags (docPayload: any, documentFlags?: ImportDocumentFlags): any {
  if (!documentFlags) return docPayload
  const endpointUrl = docPayload?.extensions?.['ext:opencase']?.sourcePackageURI as string | undefined
  if (endpointUrl) {
    return injectSourceProvenance(docPayload, endpointUrl, documentFlags)
  }

  const existing = docPayload.extensions ?? {}
  const existingOpencase = (existing['ext:opencase'] && typeof existing['ext:opencase'] === 'object')
    ? existing['ext:opencase']
    : {}

  const extPatch: Record<string, unknown> = { ...existingOpencase, importedAt: new Date().toISOString() }
  if (documentFlags.readOnly === true) extPatch.readOnly = true
  if (documentFlags.cgeFrameworkId) extPatch.cgeFrameworkId = documentFlags.cgeFrameworkId
  if (documentFlags.linkedFromDocId) extPatch.linkedFromDocId = documentFlags.linkedFromDocId
  if (documentFlags.cgeCachedAt) extPatch.cgeCachedAt = documentFlags.cgeCachedAt

  return {
    ...docPayload,
    extensions: {
      ...existing,
      'ext:opencase': extPatch
    }
  }
}

export class ImportFramework {
  constructor(
    private readonly pkgRepo: CFPackageRepository,
    private readonly apiClient: CaseApiClient,
    private readonly validator?: JsonSchemaValidator
  ) {}

  async execute (cmd: ImportFrameworkCommand): Promise<ImportFrameworkResult> {
    const { tenantId, caseVersion, endpointUrl, accessToken, cfPackage, validateSchema, schemaName, documentFlags, sourcePackageUri } = cmd

    if (!endpointUrl && !cfPackage) {
      throw new Error('Either endpointUrl or cfPackage must be provided')
    }

    let sourceCFPackage: CFPackageResponse['CFPackage']
    if (endpointUrl) {
      logger.info({ tenantId, caseVersion, endpointUrl }, 'Importing framework from endpoint')
      const response = await this.apiClient.fetchCFPackage(endpointUrl, accessToken)
      sourceCFPackage = {
        ...response.CFPackage,
        CFDocument: injectSourceProvenance(response.CFPackage.CFDocument, endpointUrl, documentFlags)
      }
    } else {
      logger.info({ tenantId, caseVersion }, 'Importing framework from provided JSON')
      const normalized = normalizeCfPackageData(cfPackage)
      const provenanceUri = (sourcePackageUri ?? endpointUrl ?? '').trim()
      sourceCFPackage = {
        ...normalized,
        CFDocument: provenanceUri
          ? injectSourceProvenance(normalized.CFDocument, provenanceUri, documentFlags)
          : applyDocumentFlags(normalized.CFDocument, documentFlags)
      }
    }

    // Use CFPackage format directly (matches API response format)
    const payload = {
      CFDocument: sourceCFPackage.CFDocument,
      CFItems: sourceCFPackage.CFItems ?? [],
      CFAssociations: sourceCFPackage.CFAssociations ?? [],
      CFRubrics: sourceCFPackage.CFRubrics ?? [],
      CFDefinitions: sourceCFPackage.CFDefinitions ?? null,
      extensions: sourceCFPackage.extensions
    }

    // Collect validation warnings (non-fatal) instead of hard failing
    const validationWarnings: string[] = []

    // Validate against JSON schema if validator is provided
    if (validateSchema && this.validator && schemaName) {
      logger.info({ schemaName }, 'Validating framework against schema')
      try {
        this.validator.validate(schemaName, payload)
      } catch (error: any) {
        logger.warn({ error: error.message, details: error.details }, 'Schema validation produced warnings during import')
        validationWarnings.push(error.message)
        // Continue with import — validation issues are reported as warnings
      }
    }

    // Create domain entities from CFPackage format
    const document = CFDocument.fromRaw(tenantId, caseVersion, payload.CFDocument)
    const docId = document.sourcedId
    const docJSON = document.toJSON()
    const docURI = docJSON.uri
    const items = (payload.CFItems ?? []).map(i => CFItem.fromRaw(tenantId, caseVersion, i, docId, docURI))
    const associations = (payload.CFAssociations ?? []).map(a =>
      CFAssociation.fromRaw(tenantId, caseVersion, a)
    )
    const rubrics = (payload.CFRubrics ?? []).map(r =>
      CFRubric.fromRaw(tenantId, caseVersion, r)
    )
    const definitions = payload.CFDefinitions ?? null

    const pkg = new CFPackage({ document, items, associations, rubrics, definitions })

    // Save the framework
    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg)

    logger.info(
      { tenantId, caseVersion, docId: document.sourcedId, warnings: validationWarnings.length },
      'Successfully imported framework'
    )

    return {
      docId: document.sourcedId,
      version: 1,
      validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined
    }
  }
}
