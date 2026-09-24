import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFItemTypeQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFItemType {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFItemTypeQuery) {
    const entry = this.store.getDefinitionById(query.tenantId, query.caseVersion, 'CFItemTypes', query.sourcedId)
    if (!entry) return null

    // Per spec, the response is the CFItemType plus the set of children as
    // determined by their place in the 'hierarchyCode' of the CFItemType.
    const hierarchyCode = entry.value?.hierarchyCode as string | undefined
    const allItemTypes = this.store.getTenantDefinitions(query.tenantId, query.caseVersion).CFItemTypes
    const children = hierarchyCode
      ? allItemTypes
        .filter((t: any) => t.identifier !== entry.value.identifier && typeof t.hierarchyCode === 'string' && t.hierarchyCode.startsWith(`${hierarchyCode}.`))
        .sort((a: any, b: any) => a.hierarchyCode.localeCompare(b.hierarchyCode))
      : []

    return { CFItemTypes: [entry.value, ...children] }
  }
}













