import type { Request, Response } from 'express'
import { GetCFRubric } from '../../../../../application/case/endpoints/GetCFRubric'
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { absolutizeCaseUris, applyFieldSelectionToEntity, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified } from '../utils/httpUtils'
import { getParam } from '../../../utils/expressParams'

export class CFRubricsControllerV1p0 {
  constructor (private readonly getCFRubric: GetCFRubric) {}

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

      const result = await this.getCFRubric.execute({
        tenantId,
        caseVersion: '1.0',
        sourcedId
      })

      if (!result) return res.status(404).json(StatusInfoFormatter.notFound('The requested CFRubric was not found.'))

      const baseUrl = getBaseUrl(req)
      const wrapped = { ...result } as any
      if (wrapped.CFRubric && parsed.value.fields?.length) {
        wrapped.CFRubric = applyFieldSelectionToEntity(wrapped.CFRubric, parsed.value.fields)
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

