import { type CaseVersion, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { type LinkData } from '../../../domain/case/value-objects/LinkData'

export interface GetAllCFDocumentsQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  limit?: number
  offset?: number
  sort?: string
  orderBy?: 'asc' | 'desc'
  filter?: string
  fields?: string[]
  includeArchived?: boolean
}

export class GetAllCFDocuments {
  constructor (private readonly store: FileFrameworkStore) {}

  async execute (query: GetAllCFDocumentsQuery) {
    //logger.info({ query }, 'Executing GetAllCFDocuments')

    // List endpoints should return all frameworks, irrespective of which CASE version path is used.
    // Each entry includes its CASE version and versioned URIs point to the correct API surface.
    const v10 = this.store.getAllDocuments(query.tenantId, '1.0').map(d => ({ meta: d, caseVersion: '1.0' as const }))
    const v11 = this.store.getAllDocuments(query.tenantId, '1.1').map(d => ({ meta: d, caseVersion: '1.1' as const }))
    let documents = [...v10, ...v11]

    // Filter archived documents (Retired or legacy Deprecated) unless includeArchived is true
    if (!query.includeArchived) {
      documents = documents.filter(doc => {
        const status = doc.meta.adoptionStatus
        // Filter out Retired and legacy Deprecated status
        return status !== 'Retired' && status !== 'Deprecated'
      })
    }

    // Apply filtering (basic implementation - can be enhanced)
    if (query.filter) {
      // Simple filter implementation - can be enhanced with proper parsing
      documents = documents.filter(doc => {
        // Basic string matching for now
        const filterLower = query.filter!.toLowerCase()
        return (
          doc.meta.title.toLowerCase().includes(filterLower) ||
          doc.meta.sourcedId.toLowerCase().includes(filterLower) ||
          (doc.meta.subject && doc.meta.subject.toLowerCase().includes(filterLower))
        )
      })
    }

    // Apply sorting
    if (query.sort) {
      const orderBy = query.orderBy ?? 'asc'
      documents.sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (query.sort) {
          case 'title':
            aVal = a.meta.title
            bVal = b.meta.title
            break
          case 'lastChangeDateTime':
            aVal = a.meta.lastChangeDateTime.getTime()
            bVal = b.meta.lastChangeDateTime.getTime()
            break
          default:
            aVal = a.meta.sourcedId
            bVal = b.meta.sourcedId
        }

        if (aVal < bVal) return orderBy === 'asc' ? -1 : 1
        if (aVal > bVal) return orderBy === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const offset = query.offset ?? 0
    const limit = query.limit
    const total = documents.length
    const paginatedDocs = limit ? documents.slice(offset, offset + limit) : documents.slice(offset)

    // Generate CFDocument objects with proper structure
    const cfDocuments = paginatedDocs.map(({ meta: docMeta, caseVersion }) => {
      const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'
      const packageURI: LinkData = {
        title: 'CFPackage',
        identifier: docMeta.sourcedId,
        uri: `${basePath}/CFPackages/${docMeta.sourcedId}`
      }

      const doc: any = {
        identifier: docMeta.sourcedId,
        uri: `${basePath}/CFDocuments/${docMeta.sourcedId}`,
        title: docMeta.title,
        lastChangeDateTime: docMeta.lastChangeDateTime.toISOString(),
        caseVersion,
        CFPackageURI: packageURI
      }

      // Add optional fields if present
      if (docMeta.language) doc.language = docMeta.language
      if (docMeta.frameworkType) doc.frameworkType = docMeta.frameworkType
      if (docMeta.subject) doc.subject = docMeta.subject
      if (docMeta.version) doc.version = docMeta.version

      // Apply field selection if specified
      if (query.fields && query.fields.length > 0) {
        const filteredDoc: any = {}
        for (const field of query.fields) {
          if (doc[field] !== undefined) {
            filteredDoc[field] = doc[field]
          }
        }
        return filteredDoc
      }

      return doc
    })

    return {
      CFDocumentSet: {
        CFDocuments: cfDocuments
      },
      // Pagination metadata (if pagination is used)
      ...(limit !== undefined && {
        total,
        limit,
        offset
      })
    }
  }
}













