import type { ImportFramework } from '../../case/endpoints/ImportFramework'
import type { CgeApiClient } from '../../../infrastructure/cge/CgeApiClient'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import type { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { normalizeCfPackageData } from '../../case/cfPackageShape'
import { resolveCoalitionFrameworkTitle } from '../../../infrastructure/cge/cgeCoalitionHelpers'
import { logger } from '../../../infrastructure/logging/Logger'

export interface ImportCgeCachedFrameworkCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  frameworkId: string
  sourceUri?: string
  registryId?: string
  subscribe?: boolean
  /** When true, re-fetch from publisher even if a cache exists. */
  refresh?: boolean
  linkedFromDocId?: string
  validateSchema?: boolean
  /** When true, fetch publisher CFPackage without CGE bearer token. */
  skipPublisherAuth?: boolean
}

export interface ImportCgeCachedFrameworkResult {
  docId: string
  version: number
  cgeFrameworkId: string
  title: string
  sourceUri: string
  itemCount: number
  cachedAt: string
  fromCache: boolean
}

export class ImportCgeCachedFramework {
  constructor (
    private readonly cgeApi: CgeApiClient,
    private readonly importFramework: ImportFramework,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (cmd: ImportCgeCachedFrameworkCommand): Promise<ImportCgeCachedFrameworkResult> {
    const {
      tenantId,
      caseVersion,
      frameworkId,
      sourceUri,
      registryId,
      subscribe = false,
      refresh = false,
      linkedFromDocId,
      validateSchema = false,
      skipPublisherAuth = false
    } = cmd

    if (!frameworkId.trim()) {
      throw new Error('frameworkId is required')
    }

    const existing = this.store.findDocumentByCgeFrameworkId(tenantId, caseVersion, frameworkId)
    if (existing && !refresh) {
      const bundle = await this.store.loadDocumentBundle(tenantId, caseVersion, existing.sourcedId)
      const itemCount = Array.isArray(bundle?.items) ? bundle!.items.length : 0
      return {
        docId: existing.sourcedId,
        version: 1,
        cgeFrameworkId: frameworkId,
        title: existing.title,
        sourceUri: existing.sourcePackageURI ?? '',
        itemCount,
        cachedAt: existing.cgeCachedAt?.toISOString() ?? existing.lastChangeDateTime.toISOString(),
        fromCache: true
      }
    }

    const resolved = await this.cgeApi.resolveFramework(tenantId, frameworkId, sourceUri, registryId)
    const endpointUrl = resolved.sourceUri

    if (subscribe) {
      try {
        await this.cgeApi.createSubscription(tenantId, { frameworkId })
      } catch (subErr: any) {
        logger.warn({ tenantId, frameworkId, error: subErr?.message }, 'CGE subscribe during cache import (continuing)')
      }
    }

    const cfPackageRaw = await this.cgeApi.fetchPublisherPackage(tenantId, endpointUrl, { skipAuth: skipPublisherAuth })
    let normalized
    try {
      normalized = normalizeCfPackageData(cfPackageRaw)
    } catch (parseErr: any) {
      throw new Error(`Publisher returned an invalid CFPackage from ${endpointUrl}: ${parseErr?.message ?? 'unknown error'}`)
    }

    const publisherDocId = String(
      normalized.CFDocument?.identifier ??
      normalized.CFDocument?.sourcedId ??
      ''
    ).trim()

    if (publisherDocId) {
      const existingMeta = this.store.getDocumentMetadata(tenantId, caseVersion, publisherDocId)
      if (existingMeta && existingMeta.readOnly !== true && existingMeta.cgeFrameworkId !== frameworkId) {
        throw new Error(
          `Framework "${existingMeta.title}" (${publisherDocId}) is already imported as an editable document. Open it from the home screen instead of adding it as a read-only remote cache.`
        )
      }
    }

    const cachedAt = new Date().toISOString()

    const result = await this.importFramework.execute({
      tenantId,
      caseVersion,
      cfPackage: cfPackageRaw,
      sourcePackageUri: endpointUrl,
      validateSchema,
      documentFlags: {
        readOnly: true,
        cgeFrameworkId: frameworkId,
        linkedFromDocId,
        cgeCachedAt: cachedAt
      }
    })

    const items = normalized.CFItems ?? []
    const title = resolveCoalitionFrameworkTitle(resolved.entry, resolved.detail, normalized)

    return {
      docId: result.docId,
      version: result.version,
      cgeFrameworkId: frameworkId,
      title,
      sourceUri: endpointUrl,
      itemCount: Array.isArray(items) ? items.length : 0,
      cachedAt,
      fromCache: false
    }
  }
}
