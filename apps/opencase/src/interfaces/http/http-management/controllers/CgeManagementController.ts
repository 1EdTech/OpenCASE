/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { Request, Response, RequestHandler } from 'express'
import type { FileCgeCredentialsStore } from '../../../../infrastructure/cge/FileCgeCredentialsStore'
import type { CgeApiClient } from '../../../../infrastructure/cge/CgeApiClient'
import type { ImportFramework } from '../../../../application/case/endpoints/ImportFramework'
import type { ImportCgeCachedFramework } from '../../../../application/cge/endpoints/ImportCgeCachedFramework'
import type { SearchCachedFrameworkItems } from '../../../../application/cge/endpoints/SearchCachedFrameworkItems'
import { requireMatchingTenant } from '../../middleware/tenantAccess'
import { getParam } from '../../utils/expressParams'
import { getCaseVersion } from '../../utils/caseVersion'
import { resolveCgeOpenIdDiscovery } from '../../../../infrastructure/cge/resolveCgeOpenIdDiscovery'
import { logger } from '../../../../infrastructure/logging/Logger'

export class CgeManagementController {
  constructor (
    private readonly credentialsStore: FileCgeCredentialsStore,
    private readonly cgeApi: CgeApiClient,
    private readonly importFramework: ImportFramework,
    private readonly importCgeCachedFramework: ImportCgeCachedFramework,
    private readonly searchCachedFrameworkItems: SearchCachedFrameworkItems
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
      const discoveryInput = typeof req.body?.discoveryUrl === 'string' ? req.body.discoveryUrl.trim() : ''
      if (!clientId || !discoveryInput) {
        return res.status(400).json({
          error: 'clientId and discoveryUrl are required'
        })
      }

      const resolved = await resolveCgeOpenIdDiscovery(discoveryInput)

      const pub = await this.credentialsStore.put(tenantId, {
        clientId,
        clientSecret,
        discoveryUrl: resolved.discoveryUrl,
        apiBaseUrl: resolved.apiBaseUrl,
        tokenUrl: resolved.tokenUrl
      })
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

      try {
        const data = await this.cgeApi.getFrameworkRegistryEntry(tenantId, frameworkId)
        return res.status(200).json(data)
      } catch (registryErr: any) {
        if (registryErr?.status !== 404) throw registryErr
        const resolved = await this.cgeApi.resolveFramework(tenantId, frameworkId)
        return res.status(200).json(resolved.detail)
      }
    } catch (error: any) {
      const status = error?.message?.includes('not found') ? 404 : 400
      return res.status(status).json({ error: error?.message || 'CGE get failed' })
    }
  }

  listSubscriptions: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const query: Record<string, string> = {}
      for (const [k, v] of Object.entries(req.query)) {
        if (typeof v === 'string') query[k] = v
      }

      const data = await this.cgeApi.listSubscriptions(tenantId, query)
      return res.status(200).json(data)
    } catch (error: any) {
      const status = error?.status === 401 ? 502 : 400
      return res.status(status).json({ error: error?.message || 'CGE subscriptions list failed' })
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

  /**
   * Import from CGE — supports two modes:
   * - readOnly: true (default for editor cache) — cached reference, not editable
   * - readOnly: false — full editable import (fork from remote publisher)
   */
  importFromCge: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const frameworkId = typeof req.body?.frameworkId === 'string' ? req.body.frameworkId.trim() : ''
      const sourceUri = typeof req.body?.sourceUri === 'string' ? req.body.sourceUri.trim() : ''
      const registryId = typeof req.body?.registryId === 'string' ? req.body.registryId.trim() : undefined
      const subscribe = req.body?.subscribe !== false
      const readOnly = req.body?.readOnly === true || req.body?.readOnly === 'true'
      const refresh = req.body?.refresh === true
      const caseVersion = (req.body?.caseVersion === '1.0' ? '1.0' : '1.1') as '1.0' | '1.1'
      const linkedFromDocId = typeof req.body?.linkedFromDocId === 'string' ? req.body.linkedFromDocId.trim() : undefined
      const skipPublisherAuth = req.body?.skipPublisherAuth === true || req.body?.skipPublisherAuth === 'true'

      if (!frameworkId && !sourceUri) {
        return res.status(400).json({
          error: 'frameworkId or sourceUri is required'
        })
      }

      // Read-only cache path (editor remote framework associations)
      if (readOnly && frameworkId) {
        const result = await this.importCgeCachedFramework.execute({
          tenantId,
          caseVersion,
          frameworkId,
          sourceUri: sourceUri || undefined,
          registryId,
          subscribe,
          refresh,
          linkedFromDocId,
          validateSchema: req.body?.validateSchema ?? false,
          skipPublisherAuth
        })

        logger.info({
          tenantId,
          sub: (req as any).user?.sub,
          frameworkId,
          docId: result.docId,
          fromCache: result.fromCache
        }, 'CGE framework cached (read-only)')

        return res.status(result.fromCache ? 200 : 201).json({
          status: result.fromCache ? 'cached' : 'imported',
          id: result.docId,
          docId: result.docId,
          version: result.version,
          cgeFrameworkId: result.cgeFrameworkId,
          title: result.title,
          sourceUri: result.sourceUri,
          itemCount: result.itemCount,
          cachedAt: result.cachedAt,
          readOnly: true,
          fromCache: result.fromCache
        })
      }

      // Editable import path (fork from remote — preserves existing ImportFramework behaviour)
      let endpointUrl = sourceUri

      if (frameworkId) {
        const resolved = await this.cgeApi.resolveFramework(tenantId, frameworkId, sourceUri, registryId)
        endpointUrl = resolved.sourceUri
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
          logger.warn({ tenantId, frameworkId, error: subErr?.message }, 'CGE subscribe during import (continuing)')
        }
      }

      const cfPackage = await this.cgeApi.fetchPublisherPackage(tenantId, endpointUrl)
      const result = await this.importFramework.execute({
        tenantId,
        caseVersion,
        cfPackage,
        validateSchema: req.body?.validateSchema ?? false
        // No documentFlags — editable import
      })

      logger.info({
        tenantId,
        sub: (req as any).user?.sub,
        email: (req as any).user?.email,
        frameworkId: frameworkId || undefined,
        docId: result.docId
      }, 'CGE framework imported (editable)')

      return res.status(201).json({
        status: 'imported',
        id: result.docId,
        docId: result.docId,
        version: result.version,
        sourceUri: endpointUrl,
        frameworkId: frameworkId || undefined,
        readOnly: false
      })
    } catch (error: any) {
      const failedTenantId = typeof (req as any).tenantId === 'string' ? (req as any).tenantId : getParam(req, 'tenantId')
      logger.warn({
        tenantId: failedTenantId,
        frameworkId: typeof req.body?.frameworkId === 'string' ? req.body.frameworkId : undefined,
        readOnly: req.body?.readOnly === true || req.body?.readOnly === 'true',
        error: error?.message,
        status: error?.status
      }, 'CGE import failed')

      let status = 400
      if (error?.status === 401 || error?.status === 403) status = 502
      else if (error?.message?.includes('not found')) status = 404
      else if (error?.message?.includes('not configured')) status = 400

      return res.status(status).json({ error: 'cge_import_failed', message: error?.message ?? 'Import failed' })
    }
  }

  refreshCachedFramework: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const frameworkId = getParam(req, 'frameworkId')
      if (!frameworkId) return res.status(400).json({ error: 'Missing frameworkId' })

      const caseVersion = getCaseVersion(req, { default: '1.1' })!
      const skipPublisherAuth = req.body?.skipPublisherAuth === true || req.body?.skipPublisherAuth === 'true'

      const result = await this.importCgeCachedFramework.execute({
        tenantId,
        caseVersion,
        frameworkId,
        refresh: true,
        subscribe: false,
        skipPublisherAuth
      })

      return res.status(200).json({
        status: 'refreshed',
        id: result.docId,
        docId: result.docId,
        cgeFrameworkId: result.cgeFrameworkId,
        title: result.title,
        sourceUri: result.sourceUri,
        itemCount: result.itemCount,
        cachedAt: result.cachedAt
      })
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || 'Refresh failed' })
    }
  }

  searchCachedItems: RequestHandler = async (req: Request, res: Response) => {
    try {
      const tenantId = requireMatchingTenant(req, res)
      if (!tenantId) return

      const docId = getParam(req, 'docId')
      if (!docId) return res.status(400).json({ error: 'Missing docId' })

      const caseVersion = getCaseVersion(req, { default: '1.1' })!
      const q = typeof req.query.q === 'string' ? req.query.q : ''
      const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50

      const result = await this.searchCachedFrameworkItems.execute({
        tenantId,
        caseVersion,
        docId,
        q,
        limit
      })

      return res.status(200).json(result)
    } catch (error: any) {
      const status = error?.message?.includes('not found') ? 404 : 400
      return res.status(status).json({ error: error?.message || 'Search failed' })
    }
  }
}
