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

export class ImportFrameworkFromEndpoint {
  constructor(
    private readonly pkgRepo: CFPackageRepository,
    private readonly apiClient: CaseApiClient,
    private readonly validator?: JsonSchemaValidator
  ) {}

  async execute (cmd: ImportFrameworkFromEndpointCommand): Promise<{ docId: string, version: number }> {
    const { tenantId, caseVersion, endpointUrl, accessToken, validateSchema, schemaName } = cmd

    logger.info({ tenantId, caseVersion, endpointUrl }, 'Importing framework from endpoint')

    // Fetch the CFPackage from the endpoint
    const response = await this.apiClient.fetchCFPackage(endpointUrl, accessToken)

    // Use CFPackage format directly (matches API response format)
    const payload = {
      CFDocument: response.CFPackage.CFDocument,
      CFItems: response.CFPackage.CFItems ?? [],
      CFAssociations: response.CFPackage.CFAssociations ?? [],
      CFRubrics: response.CFPackage.CFRubrics ?? [],
      CFDefinitions: response.CFPackage.CFDefinitions ?? null,
      extensions: response.CFPackage.extensions
    }

    // Validate against JSON schema if validator is provided
    if (validateSchema && this.validator && schemaName) {
      logger.info({ schemaName }, 'Validating framework against schema')
      try {
        this.validator.validate(schemaName, payload)
      } catch (error: any) {
        logger.error({ error: error.message, details: error.details }, 'Schema validation failed')
        throw new Error(`Schema validation failed: ${error.message}`)
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
      { tenantId, caseVersion, docId: document.sourcedId },
      'Successfully imported framework from endpoint'
    )

    // Return document ID and version info
    // Note: Version tracking would need to be implemented in FileFrameworkStore
    return {
      docId: document.sourcedId,
      version: 1 // TODO: Get actual version from store
    }
  }
}
