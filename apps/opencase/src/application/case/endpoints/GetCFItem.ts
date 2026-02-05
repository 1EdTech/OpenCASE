import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFItemQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFItem {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFItemQuery) {
    logger.info({ query }, 'Executing GetCFItem')

    // Find which document contains this item
    const docId = this.store.getDocumentIdForItem(query.tenantId, query.caseVersion, query.sourcedId)
    if (!docId) return null

    // Load the package containing this item
    const pkg = await this.pkgRepo.load(query.tenantId, query.caseVersion, docId)
    if (!pkg) return null

    // Find the specific item
    const item = pkg.items.find(i => i.sourcedId === query.sourcedId)
    if (!item) return null

    return {
      CFItem: item.toJSON()
    }
  }
}













