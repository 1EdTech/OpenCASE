import type { Request, Response } from 'express'
import { GetCFConcept } from '../../../../../application/case/endpoints/GetCFConcept'
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { absolutizeCaseUris, applyFieldSelectionToEntity, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified } from '../utils/httpUtils'
import { getParam } from '../../../utils/expressParams'

export class CFConceptsControllerV1p0 {
  constructor (private readonly getCFConcept: GetCFConcept) {}

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

      const result = await this.getCFConcept.execute({
        tenantId,
        caseVersion: '1.0',
        sourcedId
      })

      if (!result) return res.status(404).json(StatusInfoFormatter.notFound('The requested CFConcept was not found.'))

      const baseUrl = getBaseUrl(req)
      const wrapped = { ...result } as any
      if (wrapped.CFConcept && parsed.value.fields?.length) {
        wrapped.CFConcept = applyFieldSelectionToEntity(wrapped.CFConcept, parsed.value.fields)
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

