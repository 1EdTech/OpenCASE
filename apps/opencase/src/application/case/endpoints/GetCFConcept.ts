import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFConceptQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFConcept {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFConceptQuery) {
    const entry = this.store.getDefinitionById(query.tenantId, query.caseVersion, 'CFConcepts', query.sourcedId)
    if (!entry) return null

    // Per spec, the response is the CFConcept plus the set of children as
    // determined by their place in the 'hierarchyCode' of the CFConcept.
    const hierarchyCode = entry.value?.hierarchyCode as string | undefined
    const allConcepts = this.store.getTenantDefinitions(query.tenantId, query.caseVersion).CFConcepts
    const children = hierarchyCode
      ? allConcepts
        .filter((c: any) => c.identifier !== entry.value.identifier && typeof c.hierarchyCode === 'string' && c.hierarchyCode.startsWith(`${hierarchyCode}.`))
        .sort((a: any, b: any) => a.hierarchyCode.localeCompare(b.hierarchyCode))
      : []

    return { CFConcepts: [entry.value, ...children] }
  }
}













