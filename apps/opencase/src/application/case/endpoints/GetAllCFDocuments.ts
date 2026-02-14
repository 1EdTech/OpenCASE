import { type CaseVersion, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { type LinkData } from '../../../domain/case/value-objects/LinkData'

export interface GetAllCFDocumentsQuery {
  tenantId?: TenantId  // Optional — when omitted, lists across ALL tenants (global catalog)
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

    // List endpoints return all frameworks irrespective of which CASE version path is used.
    // When tenantId is provided, scope to that tenant; otherwise list across all tenants.
    let documents: Array<{ meta: import('../../../infrastructure/persistence/file/FileFrameworkStore').DocumentMetadata; caseVersion: CaseVersion }>
    if (query.tenantId) {
      const v10 = this.store.getAllDocuments(query.tenantId, '1.0').map(d => ({ meta: d, caseVersion: '1.0' as CaseVersion }))
      const v11 = this.store.getAllDocuments(query.tenantId, '1.1').map(d => ({ meta: d, caseVersion: '1.1' as CaseVersion }))
      documents = [...v10, ...v11]
    } else {
      // Global catalog: all documents from every tenant
      documents = this.store.getAllDocumentsGlobal().map(d => ({ meta: d.metadata, caseVersion: d.caseVersion }))
    }

    // Deduplicate: if the same docId exists in both v1p0 and v1p1, prefer v1p1.
    // This can happen when a v1p0 framework is re-saved via the editor (which always saves as v1p1).
    const docMap = new Map<string, typeof documents[0]>()
    for (const doc of documents) {
      const existing = docMap.get(doc.meta.sourcedId)
      if (!existing || doc.caseVersion === '1.1') {
        docMap.set(doc.meta.sourcedId, doc)
      }
    }
    documents = Array.from(docMap.values())

    // Filter server-level archived documents unless includeArchived is true
    if (!query.includeArchived) {
      documents = documents.filter(doc => doc.meta.archived !== true)
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

    // Generate CFDocument objects with proper structure.
    // Use the requested caseVersion for URI generation (not the storage version),
    // so URIs are correct regardless of where the data is stored.
    const requestedBasePath = query.caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'
    const isV1p0 = query.caseVersion === '1.0'

    const cfDocuments = paginatedDocs.map(({ meta: docMeta, caseVersion }) => {
      const packageURI: LinkData = {
        title: 'CFPackage',
        identifier: docMeta.sourcedId,
        uri: `${requestedBasePath}/CFPackages/${docMeta.sourcedId}`
      }

      const doc: any = {
        identifier: docMeta.sourcedId,
        uri: `${requestedBasePath}/CFDocuments/${docMeta.sourcedId}`,
        title: docMeta.title,
        lastChangeDateTime: docMeta.lastChangeDateTime.toISOString(),
        CFPackageURI: packageURI
      }

      // Add optional fields if present
      if (docMeta.description) doc.description = docMeta.description
      if (docMeta.creator) doc.creator = docMeta.creator
      if (docMeta.language) doc.language = docMeta.language
      if (docMeta.subject) doc.subject = docMeta.subject
      if (docMeta.version) doc.version = docMeta.version
      if (docMeta.adoptionStatus) doc.adoptionStatus = docMeta.adoptionStatus
      if (docMeta.sourcePackageURI) doc.sourcePackageURI = docMeta.sourcePackageURI
      if (docMeta.isModifiedFromSource) doc.isModifiedFromSource = docMeta.isModifiedFromSource
      if (docMeta.archived) doc.archived = true

      // CASE v1.1-only fields: only include when not serving via v1p0
      if (!isV1p0) {
        doc.caseVersion = caseVersion
        if (docMeta.frameworkType) doc.frameworkType = docMeta.frameworkType
      }

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
      CFDocuments: cfDocuments,
      // Pagination metadata (if pagination is used)
      ...(limit !== undefined && {
        total,
        limit,
        offset
      })
    }
  }
}













