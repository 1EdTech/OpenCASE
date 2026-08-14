import type { CFPackageRepository } from '../ports/CFPackageRepository'
import type { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { RegistryAssistantClient, RegistryEnvironment, RegistryAssistantResult } from '../../../infrastructure/http/RegistryAssistantClient'
import { mapCaseToCompetencyFrameworkRequest, type CompetencyFrameworkRequestPayload, type UnmappedAssociation } from '../../../infrastructure/ctdlasn/CaseToCompetencyFrameworkRequestMapper'
import { generateCtid } from '../../../infrastructure/ctdlasn/ctid'
import { logger } from '../../../infrastructure/logging/Logger'

export interface PreviewPublishCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  docId: SourcedId
  /** Override the configured environment for this dry-run (sandbox by default). */
  environment?: RegistryEnvironment
}

export interface PreviewPublishResult {
  /** The exact request OpenCASE would send (CTIDs freshly minted for this preview). */
  request: CompetencyFrameworkRequestPayload
  /** The Registry Assistant /format response (validation + formatted CTDL). */
  format: RegistryAssistantResult
  /** Cross-framework associations that have no CTDL-ASN alignment mapping and are NOT published. */
  unmappedAssociations: UnmappedAssociation[]
}

/**
 * Dry-run publishing a framework: map the stored CASE package to a Registry
 * Assistant request and POST it to the /format endpoint. Nothing is published and
 * no CTIDs are persisted — this validates the mapping and surfaces RA errors.
 */
export class PreviewPublishToRegistry {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly client: RegistryAssistantClient,
    private readonly organizationCtid?: string,
    private readonly casePublicBaseUrl?: string,
  ) {}

  async execute (cmd: PreviewPublishCommand): Promise<PreviewPublishResult> {
    if (!this.client.hasApiKey()) {
      throw new Error('Publishing is not configured: set REGISTRY_ASSISTANT_API_KEY')
    }
    if (!this.organizationCtid) {
      throw new Error('Publishing is not configured: set REGISTRY_ASSISTANT_ORG_CTID')
    }

    const pkg = await this.pkgRepo.load(cmd.tenantId, cmd.caseVersion, cmd.docId)
    if (!pkg) {
      throw new Error(`Framework ${cmd.docId} not found`)
    }

    const caseJson = {
      CFDocument: pkg.document.toJSON(),
      CFItems: pkg.items.map((i) => i.toJSON()),
      CFAssociations: pkg.associations.map((a) => a.toJSON()),
    }

    // Mint a CTID per local identifier for this preview (not persisted).
    const ctidByLocalId = new Map<string, string>()
    const ctidFor = (localId: string): string => {
      let c = ctidByLocalId.get(localId)
      if (!c) { c = generateCtid(); ctidByLocalId.set(localId, c) }
      return c
    }

    const unmappedAssociations: UnmappedAssociation[] = []
    const request = mapCaseToCompetencyFrameworkRequest(caseJson, {
      organizationCtid: this.organizationCtid,
      ctidFor,
      casePublicBaseUrl: this.casePublicBaseUrl,
      unmapped: unmappedAssociations,
    })

    logger.info(
      { docId: cmd.docId, environment: cmd.environment, competencies: request.Competencies.length, unmapped: unmappedAssociations.length },
      'Previewing publish to Registry Assistant (dry-run /format)',
    )
    const format = await this.client.format(request, cmd.environment)
    return { request, format, unmappedAssociations }
  }
}
