import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFItemAssociationsQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
  /** When set, load data from this version's storage but serialize using caseVersion semantics. */
  loadVersion?: CaseVersion
}

export class GetCFItemAssociations {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFItemAssociationsQuery) {
    // logger.info({ query }, 'Executing GetCFItemAssociations')

    // Use loadVersion for storage access if provided
    const storageVersion = query.loadVersion ?? query.caseVersion

    // Find which document contains this item
    const storageKey = this.store.getStorageKeyForItem(query.tenantId, storageVersion, query.sourcedId)
    if (!storageKey) return null

    // Load the package containing this item
    const pkg = await this.pkgRepo.load(query.tenantId, storageVersion, storageKey)
    if (!pkg) return null

    // Verify the item exists
    const item = pkg.items.find(i => i.sourcedId === query.sourcedId)
    if (!item) return null

    const matchesItem = (a: { toJSON: (v?: any) => any }) => {
      const j = a.toJSON()
      const originId = typeof j.originNodeURI === 'string' ? j.originNodeURI : j.originNodeURI?.identifier
      const destId = typeof j.destinationNodeURI === 'string' ? j.destinationNodeURI : j.destinationNodeURI?.identifier
      return originId === query.sourcedId || destId === query.sourcedId
    }

    // Intra-framework associations (within the item's own package)
    const ownAssociations = pkg.associations.filter(matchesItem)

    // Cross-framework associations from alignment packages that reference this framework
    const alignmentDocs = this.store.getAllDocuments(query.tenantId, storageVersion).filter(
      meta =>
        meta.frameworkType === 'Alignment' &&
        !meta.archived &&
        meta.alignmentParticipants?.some(p => p.identifier === pkg.document.sourcedId)
    )

    const crossAssociations = (
      await Promise.all(
        alignmentDocs.map(async meta => {
          try {
            const alignStorageKey = this.store.resolveStorageKey(query.tenantId, storageVersion, meta.sourcedId)
            if (!alignStorageKey) return []
            const alignPkg = await this.pkgRepo.load(query.tenantId, storageVersion, alignStorageKey)
            return alignPkg?.associations.filter(matchesItem) ?? []
          } catch (err) {
            logger.warn({ err, alignmentDocId: meta.sourcedId }, 'Failed to load alignment package for cross-framework associations')
            return []
          }
        })
      )
    ).flat()

    // Pass caseVersion to toJSON for correct field stripping when downconverting
    const serializeAs = query.loadVersion ? query.caseVersion : undefined
    return {
      CFItem: item.toJSON(serializeAs),
      CFAssociations: [...ownAssociations, ...crossAssociations].map(a => a.toJSON(serializeAs))
    }
  }
}

