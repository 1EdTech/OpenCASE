import type { Request, Response } from 'express'
import { GetCFDocument } from '../../../../../application/case/endpoints/GetCFDocument'
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { absolutizeCaseUris, applyFieldSelectionToEntity, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified } from '../utils/httpUtils'
import { getParam } from '../../../utils/expressParams'
import type { FileFrameworkStore } from '../../../../../infrastructure/persistence/file/FileFrameworkStore'

export class CFDocumentsControllerV1p0 {
  constructor (
    private readonly getCFDocument: GetCFDocument,
    private readonly store: FileFrameworkStore
  ) {}

  getById = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? 'demo'
      const sourcedId = getParam(req, 'id')
      const parsed = parseCaseQueryParams(req)
      if (!parsed.ok) return res.status(parsed.status).json(parsed.body)

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!sourcedId || !uuidRegex.test(sourcedId)) {
        return res.status(404).json(StatusInfoFormatter.invalidUUID('The supplied identifier is not a valid UUID.'))
      }

      const result = await this.getCFDocument.execute({
        tenantId,
        caseVersion: '1.0',
        sourcedId
      })

      if (!result) {
        if (this.store.documentExists(tenantId, '1.1', sourcedId)) {
          return res.status(409).json(StatusInfoFormatter.internalError(
            `CFDocument '${sourcedId}' exists in CASE v1p1. Use GET /ims/case/v1p1/CFDocuments/${sourcedId} (and related v1p1 endpoints).`
          ))
        }
        return res.status(404).json(StatusInfoFormatter.notFound('The requested CFDocument was not found.'))
      }

      const baseUrl = getBaseUrl(req)
      const wrapped = { ...result } as any
      if (wrapped.CFDocument && parsed.value.fields?.length) {
        wrapped.CFDocument = applyFieldSelectionToEntity(wrapped.CFDocument, parsed.value.fields)
      }
      const body = absolutizeCaseUris(wrapped, baseUrl, '1.0')
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

