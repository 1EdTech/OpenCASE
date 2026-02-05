import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFAssociationGroupingQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFAssociationGrouping {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFAssociationGroupingQuery) {
    const entry = this.store.getDefinitionById(query.tenantId, query.caseVersion, 'CFAssociationGroupings', query.sourcedId)
    if (!entry) return null
    return { CFAssociationGrouping: entry.value }
  }
}













