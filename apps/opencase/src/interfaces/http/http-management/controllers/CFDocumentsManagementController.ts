/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type Request, type Response } from 'express'
import { type UpdateCFDocument } from '../../../../application/case/endpoints/UpdateCFDocument'
import { type DeleteCFDocument } from '../../../../application/case/endpoints/DeleteCFDocument'
import { getParam } from '../../utils/expressParams'
import { getCaseVersion } from '../../utils/caseVersion'

export class CFDocumentsManagementController {
  constructor (
    private readonly updateCFDocument: UpdateCFDocument,
    private readonly deleteCFDocument: DeleteCFDocument
  ) {}

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? 'demo'
      const urlTenantId = getParam(req, 'tenantId')
      const sourcedId = getParam(req, 'id')
      const caseVersion = getCaseVersion(req, { default: '1.1' })!

      // Verify tenant from JWT matches URL parameter
      if (urlTenantId && urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch - authenticated tenant does not match URL parameter' })
      }
      if (!sourcedId) return res.status(400).json({ error: 'Missing id' })

      await this.updateCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId,
        payload: req.body
      })

      res.status(200).json({ status: 'updated' })
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return res.status(404).json({ error: error.message })
      }
      if (error.message?.includes('Schema validation failed')) {
        return res.status(400).json({
          error: 'validation_failed',
          message: error.message
        })
      }
      return res.status(400).json({ error: error.message || 'Update failed' })
    }
  }

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? 'demo'
      const urlTenantId = getParam(req, 'tenantId')
      const sourcedId = getParam(req, 'id')
      const caseVersion = getCaseVersion(req, { default: '1.1' })!

      // Verify tenant from JWT matches URL parameter
      if (urlTenantId && urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch - authenticated tenant does not match URL parameter' })
      }
      if (!sourcedId) return res.status(400).json({ error: 'Missing id' })

      // Extract hardDelete query parameter (default: false = soft delete/archive)
      const hardDelete = req.query.hardDelete === 'true'

      await this.deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId,
        hardDelete
      })

      const status = hardDelete ? 'deleted' : 'archived'
      res.status(200).json({ status })
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return res.status(404).json({ error: error.message })
      }
      return res.status(400).json({ error: error.message || 'Delete failed' })
    }
  }
}
