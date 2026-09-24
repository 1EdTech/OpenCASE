import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFSubjectQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFSubject {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFSubjectQuery) {
    const entry = this.store.getDefinitionById(query.tenantId, query.caseVersion, 'CFSubjects', query.sourcedId)
    if (!entry) return null

    // Per spec, the response is the CFSubject plus the set of children as
    // determined by their place in the 'hierarchyCode' of the CFSubject.
    const hierarchyCode = entry.value?.hierarchyCode as string | undefined
    const allSubjects = this.store.getTenantDefinitions(query.tenantId, query.caseVersion).CFSubjects
    const children = hierarchyCode
      ? allSubjects
        .filter((s: any) => s.identifier !== entry.value.identifier && typeof s.hierarchyCode === 'string' && s.hierarchyCode.startsWith(`${hierarchyCode}.`))
        .sort((a: any, b: any) => a.hierarchyCode.localeCompare(b.hierarchyCode))
      : []

    return { CFSubjects: [entry.value, ...children] }
  }
}













