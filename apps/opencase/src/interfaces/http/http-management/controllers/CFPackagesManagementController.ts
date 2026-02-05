/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type Request, type Response, type RequestHandler } from 'express'
import { type CreateFramework } from '../../../../application/case/endpoints/CreateFramework'
import { type ImportFrameworkFromEndpoint } from '../../../../application/case/endpoints/ImportFrameworkFromEndpoint'
import { type DeleteCFDocument } from '../../../../application/case/endpoints/DeleteCFDocument'
import { type ListFrameworks } from '../../../../application/case/endpoints/ListFrameworks'
import { getParam } from '../../utils/expressParams'
import { getCaseVersion } from '../../utils/caseVersion'

export class CFPackagesManagementController {
  constructor (
    private readonly createFramework: CreateFramework,
    private readonly importFramework: ImportFrameworkFromEndpoint,
    private readonly listFrameworks: ListFrameworks,
    private readonly deleteCFDocument: DeleteCFDocument
  ) {}

  list: RequestHandler<{ tenantId: string }> = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? req.params.tenantId
      const urlTenantId = getParam(req, 'tenantId')
      // For GET endpoints, `caseVersion` remains a filter param (no override needed).
      const caseVersion = getCaseVersion(req)

      if (urlTenantId && urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch - authenticated tenant does not match URL parameter' })
      }

      // Extract includeArchived query parameter (default: false)
      const includeArchived = req.query.includeArchived === 'true'

      const result = await this.listFrameworks.execute({ tenantId, caseVersion, includeArchived })
      return res.status(200).json(result)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'List failed' })
    }
  }

  create: RequestHandler<{ tenantId: string }> = async (req: Request, res: Response) => {
    const tenantId = getParam(req, 'tenantId')
    const caseVersion = getCaseVersion(req, { default: '1.1' })!

    try {
      if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' })
      
      // Check if payload uses old format and provide helpful error
      if (req.body.document && !req.body.CFDocument) {
        return res.status(400).json({ 
          error: 'invalid_format',
          message: 'Payload uses deprecated format. Please use CFPackage format with CFDocument, CFItems, CFAssociations, CFRubrics, CFDefinitions. See CASE_V1P1_API_MIGRATION_GUIDE.md for details.',
          receivedFormat: 'old (document, items, associations)',
          expectedFormat: 'CFPackage (CFDocument, CFItems, CFAssociations, CFRubrics, CFDefinitions)'
        })
      }
      
      if (!req.body.CFDocument) {
        return res.status(400).json({ 
          error: 'missing_required_field',
          message: 'CFDocument is required in CFPackage format',
          receivedKeys: Object.keys(req.body)
        })
      }
      
      const result = await this.createFramework.execute({
        tenantId,
        caseVersion,
        payload: req.body
      })

      const statusCode = result.status === 'unchanged' ? 200 : 201
      return res.status(statusCode).json(result)
    } catch (error: any) {
      if (error.message?.includes('Schema validation failed') || error.message?.includes('validation')) {
        return res.status(400).json({ 
          error: 'validation_failed', 
          message: error.message || 'Schema validation failed',
          details: error.details || error.errors || undefined
        })
      }
      return res.status(400).json({ 
        error: 'creation_failed', 
        message: error.message || 'Failed to create CFPackage',
        details: error.details || undefined
      })
    }
  }

  importFromEndpoint: RequestHandler<{ tenantId: string }> = async (req: Request, res: Response) => {
    const tenantId = getParam(req, 'tenantId')
    const caseVersion = getCaseVersion(req, { default: '1.1' })!
    const { endpointUrl, accessToken, validateSchema, schemaName } = req.body

    if (!endpointUrl) {
      return res.status(400).json({ error: 'endpointUrl is required' })
    }

    try {
      if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' })
      const result = await this.importFramework.execute({
        tenantId,
        caseVersion,
        endpointUrl,
        accessToken,
        validateSchema: validateSchema ?? false,
        schemaName
      })

      return res.status(201).json({
        status: 'imported',
        id: result.docId,
        version: result.version
      })
    } catch (error: any) {
      return res.status(400).json({ error: 'import_failed', message: error.message })
    }
  }

  delete: RequestHandler<{ tenantId: string, id: string }> = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? req.params.tenantId
      const urlTenantId = getParam(req, 'tenantId')
      const id = getParam(req, 'id')
      const caseVersion = getCaseVersion(req, { default: '1.1' })!

      if (urlTenantId && urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch - authenticated tenant does not match URL parameter' })
      }
      if (!id) return res.status(400).json({ error: 'Missing id' })

      // Extract hardDelete query parameter (default: false = soft delete/archive)
      const hardDelete = req.query.hardDelete === 'true'

      await this.deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: id,
        hardDelete
      })

      const status = hardDelete ? 'deleted' : 'archived'
      return res.status(200).json({ status, id })
    } catch (error: any) {
      const msg = error?.message || 'Delete failed'
      const status = msg.includes('not found') ? 404 : 400
      return res.status(status).json({ error: msg })
    }
  }
}

