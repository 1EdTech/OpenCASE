import { type CaseVersion, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { registryResourceUrl, type RegistryEnvironment } from '../../../infrastructure/ctdlasn/publishState'
import { logger } from '../../../infrastructure/logging/Logger'

export interface FrameworkPublishSummary {
  ctid: string
  needsUpdate: boolean
  environments: Array<{
    environment: RegistryEnvironment
    resourceUrl: string
    registryEnvelopeId?: string
    publishedAt?: string
    status?: string
  }>
}

export interface ListFrameworksQuery {
  tenantId: TenantId
  caseVersion?: CaseVersion
  includeArchived?: boolean
}

export class ListFrameworks {
  constructor (private readonly store: FileFrameworkStore) {}

  async execute (query: ListFrameworksQuery) {
    logger.info({ query }, 'Executing ListFrameworks')

    const versions: CaseVersion[] = query.caseVersion ? [query.caseVersion] : ['1.0', '1.1']
    const frameworks: Array<{
      sourcedId: string
      title: string
      caseVersion: CaseVersion
      language?: string
      frameworkType?: string
      subject?: string
      version?: string
      lastChangeDateTime: string
      publish?: FrameworkPublishSummary
    }> = []

    for (const version of versions) {
      const documents = this.store.getAllDocuments(query.tenantId, version)
      for (const doc of documents) {
        // Filter server-level archived documents unless includeArchived is true
        if (!query.includeArchived) {
          if (doc.archived === true) {
            continue // Skip archived documents
          }
        }
        
        const publish: FrameworkPublishSummary | undefined =
          doc.publishedCtid && doc.publishedEnvironments?.length
            ? {
                ctid: doc.publishedCtid,
                needsUpdate: Boolean(doc.publishNeedsUpdate),
                environments: doc.publishedEnvironments.map((e) => ({
                  environment: e.environment,
                  resourceUrl: registryResourceUrl(e.environment, doc.publishedCtid!),
                  registryEnvelopeId: e.registryEnvelopeId,
                  publishedAt: e.publishedAt,
                  status: e.status,
                })),
              }
            : undefined

        frameworks.push({
          sourcedId: doc.sourcedId,
          title: doc.title,
          caseVersion: version,
          language: doc.language,
          frameworkType: doc.frameworkType,
          subject: doc.subject,
          version: doc.version,
          lastChangeDateTime: doc.lastChangeDateTime.toISOString(),
          ...(publish ? { publish } : {}),
        })
      }
    }

    return {
      frameworks,
      total: frameworks.length,
      tenantId: query.tenantId
    }
  }
}













