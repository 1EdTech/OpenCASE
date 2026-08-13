import type { CFPackageRepository } from '../ports/CFPackageRepository'
import type { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { RegistryAssistantClient, RegistryEnvironment } from '../../../infrastructure/http/RegistryAssistantClient'
import { mapCaseToCompetencyFrameworkRequest } from '../../../infrastructure/ctdlasn/CaseToCompetencyFrameworkRequestMapper'
import { buildPublishCtids, envelopeIdFor, applyPublishResult, extractEnvelopeId, registryResourceUrl, frameworkContentHash } from '../../../infrastructure/ctdlasn/publishState'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { logger } from '../../../infrastructure/logging/Logger'

export interface PublishCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  docId: SourcedId
  environment?: RegistryEnvironment
}

export interface PublishResult {
  ctid: string
  registryEnvelopeId?: string
  environment: RegistryEnvironment
  resourceUrl: string
  isUpdate: boolean
  messages: string[]
}

function messagesOf(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const raw = (body as Record<string, unknown>).Messages
  return Array.isArray(raw) ? raw.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))) : []
}

/**
 * Publish a framework to the Credential Registry via the Registry Assistant, then
 * persist the minted CTIDs + registry envelope id back onto the framework so a
 * subsequent publish updates the same registry resource instead of duplicating it.
 */
export class PublishFrameworkToRegistry {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly client: RegistryAssistantClient,
    private readonly organizationCtid?: string,
    private readonly defaultEnvironment: RegistryEnvironment = 'sandbox',
  ) {}

  async execute (cmd: PublishCommand): Promise<PublishResult> {
    if (!this.client.hasApiKey()) throw new Error('Publishing is not configured: set REGISTRY_ASSISTANT_API_KEY')
    if (!this.organizationCtid) throw new Error('Publishing is not configured: set REGISTRY_ASSISTANT_ORG_CTID')

    const environment = cmd.environment ?? this.defaultEnvironment
    const pkg = await this.pkgRepo.load(cmd.tenantId, cmd.caseVersion, cmd.docId)
    if (!pkg) throw new Error(`Framework ${cmd.docId} not found`)

    const caseJson = {
      CFDocument: pkg.document.toJSON() as Record<string, any>,
      CFItems: pkg.items.map((i) => i.toJSON() as Record<string, any>),
      CFAssociations: pkg.associations.map((a) => a.toJSON() as Record<string, any>),
    }

    const { ctidFor, frameworkCtid } = buildPublishCtids(caseJson)
    const priorEnvelopeId = envelopeIdFor(caseJson, environment)
    const isUpdate = Boolean(priorEnvelopeId)

    const request = mapCaseToCompetencyFrameworkRequest(caseJson, {
      organizationCtid: this.organizationCtid,
      ctidFor,
      registryEnvelopeId: priorEnvelopeId,
    })

    logger.info(
      { docId: cmd.docId, environment, isUpdate, frameworkCtid, competencies: request.Competencies.length },
      'Publishing framework to Registry Assistant',
    )
    const result = await this.client.publish(request, environment)
    logger.info({ docId: cmd.docId, environment, status: result.status, ok: result.ok, body: result.body }, 'Registry Assistant publish response')

    if (!result.ok) {
      const msgs = messagesOf(result.body)
      throw new Error(`Registry Assistant rejected publish${msgs.length ? `: ${msgs.join('; ')}` : ` (HTTP ${result.status})`}`)
    }

    const registryEnvelopeId = extractEnvelopeId(result.body) ?? priorEnvelopeId
    const publishedAt = new Date().toISOString()

    // Persist CTIDs + envelope back onto the framework as a new version. Snapshot the
    // content hash so a later edit can be detected as "changed since publish".
    const contentHash = frameworkContentHash(caseJson)
    const updated = applyPublishResult(caseJson, { ctidFor, environment, registryEnvelopeId, publishedAt, contentHash })
    const document = CFDocument.fromRaw(cmd.tenantId, cmd.caseVersion, updated.CFDocument)
    const docURI = document.toJSON().uri
    const items = updated.CFItems.map((i) => CFItem.fromRaw(cmd.tenantId, cmd.caseVersion, i, document.sourcedId, docURI))
    const newPkg = new CFPackage({ document, items, associations: pkg.associations, rubrics: pkg.rubrics ?? [], definitions: pkg.definitions ?? null })
    await this.pkgRepo.saveNewVersion(cmd.tenantId, cmd.caseVersion, newPkg)

    return {
      ctid: frameworkCtid,
      registryEnvelopeId,
      environment,
      resourceUrl: registryResourceUrl(environment, frameworkCtid),
      isUpdate,
      messages: messagesOf(result.body),
    }
  }
}
