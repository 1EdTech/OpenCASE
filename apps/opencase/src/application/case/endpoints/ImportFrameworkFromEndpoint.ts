import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseApiClient } from '../../../infrastructure/http/CaseApiClient'
import { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFRubric } from '../../../domain/case/entities/CFRubric'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { logger } from '../../../infrastructure/logging/Logger'

export interface ImportFrameworkFromEndpointCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  endpointUrl: string
  accessToken?: string
  validateSchema?: boolean
  schemaName?: string
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
function injectSourceProvenance (docPayload: any, endpointUrl: string): any {
  const existing = docPayload.extensions ?? {}
  const existingOpencase = (existing['ext:opencase'] && typeof existing['ext:opencase'] === 'object')
    ? existing['ext:opencase']
    : {}

  return {
    ...docPayload,
    extensions: {
      ...existing,
      'ext:opencase': {
        ...existingOpencase,
        sourcePackageURI: endpointUrl,
        isModifiedFromSource: false,
        importedAt: new Date().toISOString(),
      }
    }
  }
}

export class ImportFrameworkFromEndpoint {
  constructor(
    private readonly pkgRepo: CFPackageRepository,
    private readonly apiClient: CaseApiClient,
    private readonly validator?: JsonSchemaValidator
  ) {}

  async execute (cmd: ImportFrameworkFromEndpointCommand): Promise<ImportFrameworkResult> {
    const { tenantId, caseVersion, endpointUrl, accessToken, validateSchema, schemaName } = cmd

    logger.info({ tenantId, caseVersion, endpointUrl }, 'Importing framework from endpoint')

    // Fetch the CFPackage from the endpoint
    const response = await this.apiClient.fetchCFPackage(endpointUrl, accessToken)

    // Inject source provenance into the CFDocument extensions
    const enrichedCFDocument = injectSourceProvenance(response.CFPackage.CFDocument, endpointUrl)

    // Use CFPackage format directly (matches API response format)
    const payload = {
      CFDocument: enrichedCFDocument,
      CFItems: response.CFPackage.CFItems ?? [],
      CFAssociations: response.CFPackage.CFAssociations ?? [],
      CFRubrics: response.CFPackage.CFRubrics ?? [],
      CFDefinitions: response.CFPackage.CFDefinitions ?? null,
      extensions: response.CFPackage.extensions
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
      'Successfully imported framework from endpoint'
    )

    return {
      docId: document.sourcedId,
      version: 1,
      validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined
    }
  }
}
