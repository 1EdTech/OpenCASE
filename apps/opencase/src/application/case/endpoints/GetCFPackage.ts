import type { CFPackageRepository } from '../ports/CFPackageRepository'
import type { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { LinkData } from '../../../domain/case/value-objects/LinkData'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFPackageQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  docId: SourcedId
}

export class GetCFPackage {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute(query: GetCFPackageQuery) {
    logger.info({ query }, 'Executing GetCFPackage')
    const pkg = await this.pkgRepo.load(query.tenantId, query.caseVersion, query.docId)
    logger.info({ pkg }, 'Loaded CFPackage')
    if (!pkg) return null

    // Note: Get by ID returns archived packages regardless - filtering only applies to list endpoints

    // Generate CFPackageURI for the document
    const basePath = query.caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'
    const packageURI: LinkData = {
      title: 'CFPackage',
      identifier: query.docId,
      uri: `${basePath}/CFPackages/${query.docId}`
    }

    const documentJSON = pkg.document.toJSON()
    // Add CFPackageURI if not already present
    if (!documentJSON.CFPackageURI) {
      documentJSON.CFPackageURI = packageURI
    }

    const result: any = {
      CFPackage: {
        CFDocument: documentJSON,
        CFItems: pkg.items.map(i => i.toJSON()),
        CFAssociations: pkg.associations.map(a => a.toJSON())
      }
    }

    // Add CFDefinitions (optional field [0..1]) using tenant defaults, overridden by per-framework definitions.
    const tenantDefs = this.store.getTenantDefinitions(query.tenantId, query.caseVersion)
    const frameworkDefs = pkg.definitions ?? null
    const mergeById = (tenantList: any[], frameworkList: any[]) => {
      const map = new Map<string, any>()
      for (const v of tenantList ?? []) {
        const id = (v?.identifier ?? v?.sourcedId) as string | undefined
        if (id) map.set(id, v)
      }
      for (const v of frameworkList ?? []) {
        const id = (v?.identifier ?? v?.sourcedId) as string | undefined
        if (id) map.set(id, v)
      }
      return Array.from(map.values())
    }

    const mergedDefinitions: any = {
      CFConcepts: mergeById(tenantDefs.CFConcepts, frameworkDefs?.CFConcepts ?? []),
      CFSubjects: mergeById(tenantDefs.CFSubjects, frameworkDefs?.CFSubjects ?? []),
      CFLicenses: mergeById(tenantDefs.CFLicenses, frameworkDefs?.CFLicenses ?? []),
      CFItemTypes: mergeById(tenantDefs.CFItemTypes, frameworkDefs?.CFItemTypes ?? []),
      CFAssociationGroupings: mergeById(tenantDefs.CFAssociationGroupings, frameworkDefs?.CFAssociationGroupings ?? [])
    }

    // CASE 1.1 supports extensions on CFDefinition; do not emit for CASE 1.0.
    if (query.caseVersion === '1.1' && frameworkDefs?.extensions) {
      mergedDefinitions.extensions = frameworkDefs.extensions
    }

    // Only include CFDefinitions if there's any content.
    const hasAnyDefinitions =
      mergedDefinitions.CFConcepts.length ||
      mergedDefinitions.CFSubjects.length ||
      mergedDefinitions.CFLicenses.length ||
      mergedDefinitions.CFItemTypes.length ||
      mergedDefinitions.CFAssociationGroupings.length ||
      (mergedDefinitions as any).extensions

    if (hasAnyDefinitions) {
      result.CFPackage.CFDefinitions = mergedDefinitions
    }

    // Add CFRubrics if present (optional field [0..*])
    if (pkg.rubrics && pkg.rubrics.length > 0) {
      result.CFPackage.CFRubrics = pkg.rubrics.map(r => r.toJSON())
    }

    // Add extensions if present (optional field [0..1])
    if (query.caseVersion === '1.1' && pkg.extensions) {
      result.CFPackage.extensions = pkg.extensions
    }

    return result
  }
}
