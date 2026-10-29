import type { Request, Response } from 'express'
import { GetAllCFDocuments } from '../../../../../application/case/endpoints/GetAllCFDocuments'
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { absolutizeCaseUris, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified, setPaginationHeaders, stripExtensions, wantsOpenCaseExtensions } from '../utils/httpUtils'

export class GetAllCFDocumentsControllerV1p0 {
  constructor (private readonly getAllCFDocuments: GetAllCFDocuments) {}

  getAll = async (req: Request, res: Response) => {
    try {
      // Authenticated: scope to the authenticated tenant's documents
      // Unauthenticated: list across ALL tenants (global catalog)
      // Every framework is listed either way — publicAccess only gates the framework's
      // contents (CFPackages, CFItems, ...), never its CFDocument.
      const tenantId = (req as any).isAuthenticated ? ((req as any).tenantId ?? undefined) : undefined

      const parsed = parseCaseQueryParams(req)
      if (!parsed.ok) return res.status(parsed.status).json(parsed.body)
      const { limit, offset, sort, orderBy, filter, fields } = parsed.value
      
      // Archiving is an OpenCASE concept, not a CASE one, so archived frameworks are listed
      // by default. Callers can opt out with includeArchived=false.
      const includeArchived = req.query.includeArchived !== 'false'

      const { total, ...documentSet } = await this.getAllCFDocuments.execute({
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

      const baseUrl = getBaseUrl(req)
      let body = absolutizeCaseUris(documentSet, baseUrl, '1.0')
      if (!wantsOpenCaseExtensions(req)) { body = stripExtensions(body) }
      setPaginationHeaders(req, res, total, parsed.value)
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

