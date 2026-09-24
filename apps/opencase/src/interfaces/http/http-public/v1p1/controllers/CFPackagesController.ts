import { Request, Response } from 'express';
import { GetCFPackage } from '../../../../../application/case/endpoints/GetCFPackage';
import { StatusInfoFormatter } from '../../../../../infrastructure/http/StatusInfoFormatter';
import { absolutizeCaseUris, getBaseUrl, parseCaseQueryParams, setEtagAndHandleNotModified, stripExtensions, wantsOpenCaseExtensions } from '../utils/httpUtils'
import { getParam } from '../../../utils/expressParams'
import type { FileFrameworkStore } from '../../../../../infrastructure/persistence/file/FileFrameworkStore'

export class CFPackagesControllerV1p1 {
  constructor(
    private readonly getCFPackage: GetCFPackage,
    private readonly store: FileFrameworkStore
  ) {}

  getById = async (req: Request, res: Response) => {
    try {
      const docId = getParam(req, 'id')
      const parsed = parseCaseQueryParams(req)
      if (!parsed.ok) return res.status(parsed.status).json(parsed.body)

      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!docId || !uuidRegex.test(docId)) {
        return res.status(404).json(StatusInfoFormatter.invalidUUID('The supplied identifier is not a valid UUID.'));
      }

      // Global lookup — IDs are globally unique across all tenants
      const resolved = this.store.resolveDocumentGlobal(docId)
      if (!resolved) {
        return res.status(404).json(StatusInfoFormatter.notFound('The requested CFPackage was not found.'));
      }

      // If it exists in the other CASE version, hint the client to use the correct endpoint
      if (resolved.version !== '1.1') {
        return res.status(409).json(StatusInfoFormatter.internalError(
          `CFPackage '${docId}' exists in CASE v1p0. Use GET /ims/case/v1p0/CFPackages/${docId} (and related v1p0 endpoints).`
        ))
      }

      // Access control: unauthenticated requests only see public frameworks
      if (!(req as any).isAuthenticated && !this.store.isDocumentPublic(resolved.tenantId, '1.1', resolved.storageKey)) {
        return res.status(401).json(StatusInfoFormatter.unauthorized('Authentication required to access this framework.'))
      }

      const result = await this.getCFPackage.execute({
        tenantId: resolved.tenantId,
        caseVersion: '1.1',
        docId
      });

      if (!result) {
        return res.status(404).json(StatusInfoFormatter.notFound('The requested CFPackage was not found.'));
      }

      const baseUrl = getBaseUrl(req)
      let body = absolutizeCaseUris(result, baseUrl)
      if (!wantsOpenCaseExtensions(req)) {
        body = stripExtensions(body)
      }
      if (setEtagAndHandleNotModified(req, res, body)) return
      return res.status(200).json(body);
    } catch (error: any) {
      // Handle different error types
      if (error.status === 401) {
        return res.status(401).json(StatusInfoFormatter.unauthorized(error.message));
      }
      if (error.status === 403) {
        return res.status(403).json(StatusInfoFormatter.forbidden(error.message));
      }
      if (error.status === 429) {
        return res.status(429).json(StatusInfoFormatter.serverBusy(error.message));
      }
      
      // Default to 500 for unexpected errors
      return res.status(500).json(StatusInfoFormatter.internalError(error.message || 'An internal server error occurred.'));
    }
  };
}

