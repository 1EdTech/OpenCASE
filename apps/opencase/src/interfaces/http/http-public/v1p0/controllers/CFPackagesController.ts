import { Request, Response } from 'express'
import { GetCFPackage } from '../../../../../application/case/endpoints/GetCFPackage'
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { absolutizeCaseUris, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified } from '../utils/httpUtils'
import { getParam } from '../../../utils/expressParams'
import type { FileFrameworkStore } from '../../../../../infrastructure/persistence/file/FileFrameworkStore'

export class CFPackagesControllerV1p0 {
  constructor (
    private readonly getCFPackage: GetCFPackage,
    private readonly store: FileFrameworkStore
  ) {}

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? 'demo'
      const docId = getParam(req, 'id')
      const parsed = parseCaseQueryParams(req)
      if (!parsed.ok) return res.status(parsed.status).json(parsed.body)

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!docId || !uuidRegex.test(docId)) {
        return res.status(404).json(StatusInfoFormatter.invalidUUID('The supplied identifier is not a valid UUID.'))
      }

      const result = await this.getCFPackage.execute({
        tenantId,
        caseVersion: '1.0',
        docId
      })

      if (!result) {
        if (this.store.documentExists(tenantId, '1.1', docId)) {
          return res.status(409).json(StatusInfoFormatter.internalError(
            `CFPackage '${docId}' exists in CASE v1p1. Use GET /ims/case/v1p1/CFPackages/${docId} (and related v1p1 endpoints).`
          ))
        }
        return res.status(404).json(StatusInfoFormatter.notFound('The requested CFPackage was not found.'))
      }

      const baseUrl = getBaseUrl(req)
      const body = absolutizeCaseUris(result, baseUrl, '1.0')
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

