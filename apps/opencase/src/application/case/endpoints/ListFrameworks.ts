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
      readOnly?: boolean
      cgeFrameworkId?: string
      sourcePackageURI?: string
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
        
        frameworks.push({
          sourcedId: doc.sourcedId,
          title: doc.title,
          caseVersion: version,
          language: doc.language,
          frameworkType: doc.frameworkType,
          subject: doc.subject,
          version: doc.version,
          lastChangeDateTime: doc.lastChangeDateTime.toISOString(),
          readOnly: doc.readOnly === true,
          cgeFrameworkId: doc.cgeFrameworkId,
          sourcePackageURI: doc.sourcePackageURI,
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













