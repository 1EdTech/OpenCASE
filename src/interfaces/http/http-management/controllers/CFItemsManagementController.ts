/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type Request, type Response } from 'express'
import { type UpdateCFItem } from '../../../../application/case/endpoints/UpdateCFItem'
import { type DeleteCFItem } from '../../../../application/case/endpoints/DeleteCFItem'

export class CFItemsManagementController {
  constructor (
    private readonly updateCFItem: UpdateCFItem,
    private readonly deleteCFItem: DeleteCFItem
  ) {}

  update = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? 'demo'
      const urlTenantId = req.params.tenantId
      const sourcedId = req.params.id
      const caseVersion = (req.query.caseVersion as '1.0' | '1.1') ?? '1.1'

      // Verify tenant from JWT matches URL parameter
      if (urlTenantId && urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch - authenticated tenant does not match URL parameter' })
      }

      await this.updateCFItem.execute({
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
      return res.status(400).json({ error: error.message || 'Update failed' })
    }
  }

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? 'demo'
      const urlTenantId = req.params.tenantId
      const sourcedId = req.params.id
      const caseVersion = (req.query.caseVersion as '1.0' | '1.1') ?? '1.1'

      // Verify tenant from JWT matches URL parameter
      if (urlTenantId && urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch - authenticated tenant does not match URL parameter' })
      }

      await this.deleteCFItem.execute({
        tenantId,
        caseVersion,
        sourcedId
      })

      res.status(200).json({ status: 'deleted' })
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return res.status(404).json({ error: error.message })
      }
      return res.status(400).json({ error: error.message || 'Delete failed' })
    }
  }
}
