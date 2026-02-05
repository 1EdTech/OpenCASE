import { type CaseVersion, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { logger } from '../../../infrastructure/logging/Logger'

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
    }> = []

    for (const version of versions) {
      const documents = this.store.getAllDocuments(query.tenantId, version)
      for (const doc of documents) {
        // Filter archived documents (Retired or legacy Deprecated) unless includeArchived is true
        if (!query.includeArchived) {
          const status = doc.adoptionStatus
          if (status === 'Retired' || status === 'Deprecated') {
            continue // Skip archived documents
          }
        }
        
        frameworks.push({
          sourcedId: doc.sourcedId,
          title: doc.title,
          caseVersion: version,
          language: doc.language,
          frameworkType: doc.frameworkType,
          subject: doc.subject,
          version: doc.version,
          lastChangeDateTime: doc.lastChangeDateTime.toISOString()
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













