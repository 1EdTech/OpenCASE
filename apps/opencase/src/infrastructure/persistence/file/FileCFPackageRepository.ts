import { type CFPackageRepository } from '../../../application/case/ports/CFPackageRepository'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type FileFrameworkStore } from './FileFrameworkStore'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFRubric } from '../../../domain/case/entities/CFRubric'
import { logger } from '../../logging/Logger'

export class FileCFPackageRepository implements CFPackageRepository {
  constructor (private readonly store: FileFrameworkStore) {}

  /**
   * `storageKey` — never a public identifier. Callers that only have a
   * document's current identifier must resolve it first via
   * `FileFrameworkStore.resolveStorageKey`/`resolveDocumentGlobal`.
   */
  async load (
    tenantId: TenantId,
    version: CaseVersion,
    storageKey: SourcedId
  ): Promise<CFPackage | null> {
    logger.info({ tenantId, version, storageKey }, 'Loading CFPackage')
    const bundle = await this.store.loadDocumentBundle(tenantId, version, storageKey)
    if (!bundle) return null

    // A framework that is still a pristine mirror of its import source (never
    // locally forked) keeps its original identifiers/URIs on every load — they're
    // only regenerated once it's edited and marked as forked.
    const opencaseExt = (bundle.document as { extensions?: Record<string, unknown> })?.extensions?.['ext:opencase'] as { isModifiedFromSource?: boolean } | undefined
    const preserveUris = { preserveUris: opencaseExt?.isModifiedFromSource === false }

    const document = CFDocument.fromRaw(tenantId, version, bundle.document, preserveUris)
    const docURI = document.toJSON().uri

    const items = (bundle.items ?? []).map((i: unknown) =>
      CFItem.fromRaw(tenantId, version, i, document.sourcedId, docURI, preserveUris)
    )
    const associations = (bundle.associations ?? []).map((a: unknown) =>
      CFAssociation.fromRaw(tenantId, version, a, preserveUris)
    )
    const rubrics = (bundle.rubrics ?? []).map((r: unknown) =>
      CFRubric.fromRaw(tenantId, version, r, preserveUris)
    )
    const definitions = bundle.definitions ?? null

    return new CFPackage({ document, items, associations, rubrics, definitions })
  }

  /**
   * `storageKey` is required and is always the storage location to write to —
   * never derived from `pkg.document.sourcedId` (which, after a fork, is a
   * brand-new identifier the store has never seen and cannot resolve back to
   * anything). Callers always know this value already: it's either the
   * storage key an existing document already resolved to, or a freshly
   * minted one for a document that doesn't exist yet.
   */
  async saveNewVersion (
    tenantId: TenantId,
    version: CaseVersion,
    pkg: CFPackage,
    storageKey: string
  ): Promise<void> {
    const docId = pkg.document.sourcedId
    const bundle: { document: unknown, items: unknown[], associations: unknown[], rubrics: unknown[], definitions?: unknown } = {
      document: pkg.document.toJSON(),
      items: pkg.items.map(i => i.toJSON()),
      associations: pkg.associations.map(a => a.toJSON()),
      rubrics: (pkg.rubrics ?? []).map(r => r.toJSON())
    }

    if (pkg.definitions) {
      bundle.definitions = pkg.definitions
    }

    // Guard against GUID reuse across different frameworks/entities before writing.
    this.store.assertNoEntityIdReuse(tenantId, version, docId, storageKey, bundle)

    const { relativePath } = await this.store.writeBundleFile(tenantId, version, storageKey, bundle)

    // Update indexes (both in-memory and on disk)
    await this.store.updateIndexesForBundle(tenantId, version, storageKey, bundle, relativePath)
  }
}
