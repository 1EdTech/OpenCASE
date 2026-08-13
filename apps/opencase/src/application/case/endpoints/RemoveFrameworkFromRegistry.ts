import type { CFPackageRepository } from '../ports/CFPackageRepository'
import type { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { RegistryAssistantClient, RegistryEnvironment } from '../../../infrastructure/http/RegistryAssistantClient'
import { mapCaseToCompetencyFrameworkRequest } from '../../../infrastructure/ctdlasn/CaseToCompetencyFrameworkRequestMapper'
import { buildPublishCtids, envelopeIdFor, clearPublishEnvironment, markPublishDeprecated } from '../../../infrastructure/ctdlasn/publishState'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { logger } from '../../../infrastructure/logging/Logger'

export type RemoveMode = 'delete' | 'deprecate'

export interface RemoveCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  docId: SourcedId
  environment?: RegistryEnvironment
  mode: RemoveMode
}

export interface RemoveResult {
  mode: RemoveMode
  environment: RegistryEnvironment
  ctid: string
  /** For delete: whether the local publish link was fully cleared (no environments left). */
  publishLinkCleared?: boolean
  messages: string[]
}

function messagesOf(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const raw = (body as Record<string, unknown>).Messages
  return Array.isArray(raw) ? raw.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))) : []
}

/**
 * Remove a published framework from the Credential Registry, either by hard-deleting the
 * resource (sandbox cleanup) or by deprecating it (re-publishing with
 * PublicationStatusType: Deprecated, CE's recommended practice since registry data is
 * meant to be permanent). Delete clears the local publish link so the framework shows as
 * unpublished and a later publish mints fresh CTIDs; deprecate keeps the link.
 */
export class RemoveFrameworkFromRegistry {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly client: RegistryAssistantClient,
    private readonly organizationCtid?: string,
    private readonly defaultEnvironment: RegistryEnvironment = 'sandbox',
  ) {}

  async execute (cmd: RemoveCommand): Promise<RemoveResult> {
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
    const envelopeId = envelopeIdFor(caseJson, environment)
    const published = (caseJson.CFDocument.extensions?.['ext:opencase'] as any)?.published
    if (!published || !published.byEnvironment?.[environment]) {
      throw new Error(`Framework is not published to ${environment}`)
    }

    logger.info({ docId: cmd.docId, environment, mode: cmd.mode, frameworkCtid }, 'Removing framework from Registry Assistant')

    let updated: { CFDocument: Record<string, any>; CFItems: Record<string, any>[] }
    let publishLinkCleared: boolean | undefined
    let messages: string[]

    if (cmd.mode === 'delete') {
      const result = await this.client.delete(
        { CTID: frameworkCtid, PublishForOrganizationIdentifier: this.organizationCtid },
        environment,
      )
      logger.info({ docId: cmd.docId, environment, status: result.status, ok: result.ok, body: result.body }, 'Registry Assistant delete response')
      if (!result.ok) {
        const msgs = messagesOf(result.body)
        throw new Error(`Registry Assistant rejected delete${msgs.length ? `: ${msgs.join('; ')}` : ` (HTTP ${result.status})`}`)
      }
      const cleared = clearPublishEnvironment(caseJson, environment)
      updated = cleared
      publishLinkCleared = cleared.publishRemoved
      messages = messagesOf(result.body)
    } else {
      // Deprecate: re-publish the same resource (reusing CTIDs + envelope) as Deprecated.
      const request = mapCaseToCompetencyFrameworkRequest(caseJson, {
        organizationCtid: this.organizationCtid,
        ctidFor,
        registryEnvelopeId: envelopeId,
        publicationStatusType: 'Deprecated',
      })
      const result = await this.client.publish(request, environment)
      logger.info({ docId: cmd.docId, environment, status: result.status, ok: result.ok, body: result.body }, 'Registry Assistant deprecate response')
      if (!result.ok) {
        const msgs = messagesOf(result.body)
        throw new Error(`Registry Assistant rejected deprecate${msgs.length ? `: ${msgs.join('; ')}` : ` (HTTP ${result.status})`}`)
      }
      updated = markPublishDeprecated(caseJson, environment, new Date().toISOString())
      messages = messagesOf(result.body)
    }

    const document = CFDocument.fromRaw(cmd.tenantId, cmd.caseVersion, updated.CFDocument)
    const docURI = document.toJSON().uri
    const items = updated.CFItems.map((i) => CFItem.fromRaw(cmd.tenantId, cmd.caseVersion, i, document.sourcedId, docURI))
    const newPkg = new CFPackage({ document, items, associations: pkg.associations, rubrics: pkg.rubrics ?? [], definitions: pkg.definitions ?? null })
    await this.pkgRepo.saveNewVersion(cmd.tenantId, cmd.caseVersion, newPkg)

    return { mode: cmd.mode, environment, ctid: frameworkCtid, publishLinkCleared, messages }
  }
}
