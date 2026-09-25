import { type CaseVersion, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type FileFrameworkStore, getOpenCaseAlignmentParticipants } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { logger } from '../../../infrastructure/logging/Logger'

export interface ListFrameworksQuery {
  tenantId: TenantId
  caseVersion?: CaseVersion
  includeArchived?: boolean
  /** When set, only frameworks with this frameworkType are returned */
  frameworkType?: string
  /** When set, only alignment frameworks listing this docId as a participant are returned */
  participantId?: string
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
      extensions?: { 'ext:opencase': Record<string, unknown> }
    }> = []

    for (const version of versions) {
      const documents = this.store.getAllDocuments(query.tenantId, version)
      for (const doc of documents) {
        if (!query.includeArchived && doc.archived === true) continue
        if (query.frameworkType && doc.frameworkType !== query.frameworkType) continue
        if (query.participantId) {
          const participates = getOpenCaseAlignmentParticipants(doc)?.some(p => p.identifier === query.participantId)
          if (!participates) continue
        }

        frameworks.push({
          sourcedId: doc.sourcedId,
          title: doc.title,
          caseVersion: version,
          language: doc.language,
          frameworkType: doc.frameworkType,
          subject: doc.subject,
          version: doc.version,
          lastChangeDateTime: doc.lastChangeDateTime.toISOString(),
          // Serve the complete, untransformed ext:opencase object verbatim (not a hand-picked
          // subset), nested under `extensions` so the caller (management controller) can strip
          // it the same way the public API strips `extensions` when X-CASE-EDITOR is absent.
          ...(doc.openCaseExtensions ? { extensions: { 'ext:opencase': doc.openCaseExtensions } } : {})
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













