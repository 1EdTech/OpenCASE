/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type Request, type Response } from 'express'
import { type ListFrameworks } from '../../../../application/case/endpoints/ListFrameworks'

export class FrameworksManagementController {
  constructor (private readonly listFrameworks: ListFrameworks) {}

  list = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? req.params.tenantId
      const urlTenantId = req.params.tenantId
      const caseVersion = req.query.caseVersion as '1.0' | '1.1' | undefined

      // Verify tenant from JWT matches URL parameter
      if (urlTenantId && urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch - authenticated tenant does not match URL parameter' })
      }

      const result = await this.listFrameworks.execute({
        tenantId,
        caseVersion
      })

      res.status(200).json(result)
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'List failed' })
    }
  }
}
