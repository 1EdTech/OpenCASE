import type { Request, Response } from 'express'
import { GetCFItem } from '../../../../../application/case/endpoints/GetCFItem'
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter'
import { absolutizeCaseUris, applyFieldSelectionToEntity, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified, stripExtensions, wantsOpenCaseExtensions } from '../utils/httpUtils'
import { getParam } from '../../../utils/expressParams'
import type { FileFrameworkStore } from '../../../../../infrastructure/persistence/file/FileFrameworkStore'

export class CFItemsControllerV1p0 {
  constructor (
    private readonly getCFItem: GetCFItem,
    private readonly store: FileFrameworkStore
  ) {}

  getById = async (req: Request, res: Response) => {
    try {
      const sourcedId = getParam(req, 'id')
      const parsed = parseCaseQueryParams(req)
      if (!parsed.ok) return res.status(parsed.status).json(parsed.body)

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!sourcedId || !uuidRegex.test(sourcedId)) {
        return res.status(404).json(StatusInfoFormatter.invalidUUID('The supplied identifier is not a valid UUID.'))
      }

      // Global lookup — IDs are globally unique across all tenants
      const resolved = this.store.resolveItemGlobal(sourcedId)
      if (!resolved) {
        return res.status(404).json(StatusInfoFormatter.notFound('The requested CFItem was not found.'))
      }

      if (resolved.version !== '1.0') {
        return res.status(409).json(StatusInfoFormatter.internalError(
          `CFItem '${sourcedId}' exists in CASE v1p1. Use GET /ims/case/v1p1/CFItems/${sourcedId} (and related v1p1 endpoints).`
        ))
      }

      // Access control: check parent framework's license
      if (!(req as any).isAuthenticated) {
        if (!this.store.isDocumentPublic(resolved.tenantId, '1.0', resolved.docSourcedId)) {
          return res.status(401).json(StatusInfoFormatter.unauthorized('Authentication required to access this item.'))
        }
      }

      const result = await this.getCFItem.execute({
        tenantId: resolved.tenantId,
        caseVersion: '1.0',
        sourcedId
      })

      if (!result) {
        return res.status(404).json(StatusInfoFormatter.notFound('The requested CFItem was not found.'))
      }

      const baseUrl = getBaseUrl(req)
      const wrapped = { ...result } as any
      if (wrapped.CFItem && parsed.value.fields?.length) {
        wrapped.CFItem = applyFieldSelectionToEntity(wrapped.CFItem, parsed.value.fields)
      }
      let body = absolutizeCaseUris(wrapped, baseUrl, '1.0')
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

