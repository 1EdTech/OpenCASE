import type { Request, Response } from 'express'
import { GetAllCFDocuments } from '../../../../../application/case/endpoints/GetAllCFDocuments'
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { absolutizeCaseUris, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified, stripExtensions, wantsOpenCaseExtensions } from '../utils/httpUtils'
import type { FileFrameworkStore } from '../../../../../infrastructure/persistence/file/FileFrameworkStore'

export class GetAllCFDocumentsControllerV1p0 {
  constructor (
    private readonly getAllCFDocuments: GetAllCFDocuments,
    private readonly store: FileFrameworkStore
  ) {}

  getAll = async (req: Request, res: Response) => {
    try {
      // Authenticated: scope to the authenticated tenant's documents
      // Unauthenticated: list across ALL tenants (global catalog), filtered to public only
      const tenantId = (req as any).isAuthenticated ? ((req as any).tenantId ?? undefined) : undefined

      const parsed = parseCaseQueryParams(req)
      if (!parsed.ok) return res.status(parsed.status).json(parsed.body)
      const { limit, offset, sort, orderBy, filter, fields } = parsed.value
      
      // Extract includeArchived query parameter (default: false)
      const includeArchived = req.query.includeArchived === 'true'

      const result = await this.getAllCFDocuments.execute({
        tenantId,
        caseVersion: '1.0',
        limit,
        offset,
        sort,
        orderBy,
        filter,
        fields,
        includeArchived
      })

      // Access control: unauthenticated requests only see public frameworks
      if (!(req as any).isAuthenticated && result.CFDocumentSet?.CFDocuments) {
        result.CFDocumentSet.CFDocuments = result.CFDocumentSet.CFDocuments.filter(
          (doc: any) => this.store.isDocumentPublicGlobal(doc.identifier)
        )
      }

      const baseUrl = getBaseUrl(req)
      let body = absolutizeCaseUris(result, baseUrl, '1.0')
      if (!wantsOpenCaseExtensions(req)) { body = stripExtensions(body) }
      if (setEtagAndHandleNotModified(req, res, body)) return
      return res.status(200).json(body)
    } catch (error: any) {
      if (error.status === 401) return res.status(401).json(StatusInfoFormatter.unauthorized(error.message))
      if (error.status === 403) return res.status(403).json(StatusInfoFormatter.forbidden(error.message))
      if (error.status === 429) return res.status(429).json(StatusInfoFormatter.serverBusy(error.message))
      return res.status(500).json(StatusInfoFormatter.internalError(error.message || 'An internal server error occurred.'))
    }
  }
}

