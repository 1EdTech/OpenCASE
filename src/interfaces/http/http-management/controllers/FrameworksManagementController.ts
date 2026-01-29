/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type Request, type Response } from 'express'
import { type ListFrameworks } from '../../../../application/case/endpoints/ListFrameworks'
import { type DeleteCFDocument } from '../../../../application/case/endpoints/DeleteCFDocument'

export class FrameworksManagementController {
  constructor (
    private readonly listFrameworks: ListFrameworks,
    private readonly deleteCFDocument: DeleteCFDocument
  ) {}

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

  delete = async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId ?? req.params.tenantId
      const urlTenantId = req.params.tenantId
      const docId = req.params.docId
      const caseVersion = (req.query.caseVersion as '1.0' | '1.1') ?? '1.1'

      // Verify tenant from JWT matches URL parameter
      if (urlTenantId && urlTenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch - authenticated tenant does not match URL parameter' })
      }

      await this.deleteCFDocument.execute({
        tenantId,
        caseVersion,
        sourcedId: docId
      })

      return res.status(200).json({ status: 'deleted', docId })
    } catch (error: any) {
      const msg = error?.message || 'Delete failed'
      const status = msg.includes('not found') ? 404 : 400
      return res.status(status).json({ error: msg })
    }
  }
}
