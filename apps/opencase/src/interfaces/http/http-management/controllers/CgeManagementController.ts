/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { Request, Response, RequestHandler } from 'express'
import type { FileCgeCredentialsStore } from '../../../../infrastructure/cge/FileCgeCredentialsStore'
import type { CgeApiClient } from '../../../../infrastructure/cge/CgeApiClient'
import type { ImportFramework } from '../../../../application/case/endpoints/ImportFramework'
import { requireMatchingTenant } from '../../middleware/tenantAccess'
import { getParam } from '../../utils/expressParams'
import { logger } from '../../../../infrastructure/logging/Logger'

export class CgeManagementController {
  constructor (
    private readonly credentialsStore: FileCgeCredentialsStore,
    private readonly cgeApi: CgeApiClient,
    private readonly importFramework: ImportFramework
  ) {}

  getCredentials: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return
      const pub = await this.credentialsStore.getPublic(tenantId)
      return res.status(200).json(pub)
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || 'Failed to get credentials' })
    }
  }

  putCredentials: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : ''
      const clientSecret = typeof req.body?.clientSecret === 'string' ? req.body.clientSecret : ''
      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'clientId and clientSecret are required' })
      }

      const pub = await this.credentialsStore.put(tenantId, clientId, clientSecret)
      logger.info({ tenantId, sub: (req as any).user?.sub }, 'CGE credentials updated')
      return res.status(200).json(pub)
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || 'Failed to store credentials' })
    }
  }

  deleteCredentials: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return
      await this.credentialsStore.delete(tenantId)
      logger.info({ tenantId, sub: (req as any).user?.sub }, 'CGE credentials deleted')
      return res.status(200).json({ status: 'deleted' })
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || 'Failed to delete credentials' })
    }
  }

  testCredentials: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return
      const result = await this.cgeApi.testCredentials(tenantId)
      return res.status(result.ok ? 200 : 400).json(result)
    } catch (error: any) {
      return res.status(400).json({ ok: false, message: error?.message || 'Test failed' })
    }
  }

  listFrameworks: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const query: Record<string, string> = {}
      for (const [k, v] of Object.entries(req.query)) {
        if (typeof v === 'string') query[k] = v
      }

      const data = await this.cgeApi.listFrameworks(tenantId, query)
      logger.info({
        tenantId,
        sub: (req as any).user?.sub,
        email: (req as any).user?.email
      }, 'CGE frameworks search')
      return res.status(200).json(data)
    } catch (error: any) {
      const status = error?.status === 401 ? 502 : 400
      return res.status(status).json({ error: error?.message || 'CGE list failed' })
    }
  }

  getFramework: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return
      const frameworkId = getParam(req, 'frameworkId')
      if (!frameworkId) return res.status(400).json({ error: 'Missing frameworkId' })

      const data = await this.cgeApi.getFramework(tenantId, frameworkId)
      return res.status(200).json(data)
    } catch (error: any) {
      const status = error?.status === 404 ? 404 : 400
      return res.status(status).json({ error: error?.message || 'CGE get failed' })
    }
  }

  createSubscription: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const data = await this.cgeApi.createSubscription(tenantId, req.body ?? {})
      logger.info({
        tenantId,
        sub: (req as any).user?.sub,
        body: req.body
      }, 'CGE subscription created')
      return res.status(201).json(data ?? { status: 'created' })
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || 'CGE subscribe failed' })
    }
  }

  importFromCge: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const frameworkId = typeof req.body?.frameworkId === 'string' ? req.body.frameworkId.trim() : ''
      const sourceUri = typeof req.body?.sourceUri === 'string' ? req.body.sourceUri.trim() : ''
      const subscribe = req.body?.subscribe !== false
      const caseVersion = (req.body?.caseVersion === '1.0' ? '1.0' : '1.1') as '1.0' | '1.1'

      let endpointUrl = sourceUri
      let detail: any = null

      if (frameworkId) {
        detail = await this.cgeApi.getFramework(tenantId, frameworkId)
        endpointUrl = endpointUrl ||
          detail?.sourceUri ||
          detail?.source_uri ||
          detail?.uri ||
          detail?.CFDocument?.uri ||
          detail?.packageUri ||
          ''
      }

      if (!endpointUrl) {
        return res.status(400).json({
          error: 'sourceUri or frameworkId with a resolvable publisher URI is required'
        })
      }

      if (subscribe && frameworkId) {
        try {
          await this.cgeApi.createSubscription(tenantId, {
            frameworkId,
            ...(req.body?.subscription ?? {})
          })
        } catch (subErr: any) {
          // Subscription may already exist; continue with fetch
          logger.warn({ tenantId, frameworkId, error: subErr?.message }, 'CGE subscribe during import (continuing)')
        }
      }

      const cfPackage = await this.cgeApi.fetchPublisherPackage(tenantId, endpointUrl)
      const result = await this.importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage,
        validateSchema: req.body?.validateSchema ?? false
      })

      logger.info({
        tenantId,
        sub: (req as any).user?.sub,
        email: (req as any).user?.email,
        frameworkId: frameworkId || undefined,
        docId: result.docId
      }, 'CGE framework imported')

      return res.status(201).json({
        status: 'imported',
        id: result.docId,
        version: result.version,
        sourceUri: endpointUrl,
        frameworkId: frameworkId || undefined
      })
    } catch (error: any) {
      return res.status(400).json({ error: 'cge_import_failed', message: error?.message })
    }
  }
}
