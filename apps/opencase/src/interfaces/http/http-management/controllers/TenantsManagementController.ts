/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type Request, type Response } from 'express'
import { type ListTenants } from '../../../../application/case/endpoints/ListTenants'
import { type CreateTenant } from '../../../../application/case/endpoints/CreateTenant'

export class TenantsManagementController {
  constructor (
    private readonly listTenants: ListTenants,
    private readonly createTenant: CreateTenant,
    private readonly baseDataDir: string
  ) {}

  list = async (req: Request, res: Response) => {
    try {
      const result = await this.listTenants.execute({
        baseDataDir: this.baseDataDir
      })

      res.status(200).json(result)
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'List failed' })
    }
  }

  create = async (req: Request, res: Response) => {
    try {
      const tenantId = req.body.tenantId

      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required in request body' })
      }

      // Validate tenantId format (basic validation)
      if (!/^[a-zA-Z0-9_-]+$/.test(tenantId as string)) {
        return res.status(400).json({ error: 'tenantId must contain only alphanumeric characters, hyphens, and underscores' })
      }

      const result = await this.createTenant.execute({
        baseDataDir: this.baseDataDir,
        tenantId
      })

      res.status(201).json({
        status: 'created',
        tenantId: result.tenantId,
        adminAccount: result.adminAccount
      })
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        return res.status(409).json({ error: error.message })
      }
      return res.status(400).json({ error: error.message || 'Create failed' })
    }
  }
}
