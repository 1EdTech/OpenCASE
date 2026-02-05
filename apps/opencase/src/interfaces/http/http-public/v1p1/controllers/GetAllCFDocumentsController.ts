import type { Request, Response } from 'express'
import { GetAllCFDocuments } from '../../../../../application/case/endpoints/GetAllCFDocuments'
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { absolutizeCaseUris, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified } from '../utils/httpUtils'

export class GetAllCFDocumentsControllerV1p1 {
  constructor (private readonly getAllCFDocuments: GetAllCFDocuments) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? 'demo'

      const parsed = parseCaseQueryParams(req)
      if (!parsed.ok) return res.status(parsed.status).json(parsed.body)
      const { limit, offset, sort, orderBy, filter, fields } = parsed.value
      
      // Extract includeArchived query parameter (default: false)
      const includeArchived = req.query.includeArchived === 'true'

      const result = await this.getAllCFDocuments.execute({
        tenantId,
        caseVersion: '1.1',
        limit,
        offset,
        sort,
        orderBy,
        filter,
        fields,
        includeArchived
      })

      const baseUrl = getBaseUrl(req)
      const body = absolutizeCaseUris(result, baseUrl)
      if (setEtagAndHandleNotModified(req, res, body)) return
      return res.status(200).json(body)
    } catch (error: any) {
      if (error.status === 401) {
        return res.status(401).json(StatusInfoFormatter.unauthorized(error.message))
      }
      if (error.status === 403) {
        return res.status(403).json(StatusInfoFormatter.forbidden(error.message))
      }
      if (error.status === 429) {
        return res.status(429).json(StatusInfoFormatter.serverBusy(error.message))
      }
      return res.status(500).json(StatusInfoFormatter.internalError(error.message || 'An internal server error occurred.'))
    }
  }
}













