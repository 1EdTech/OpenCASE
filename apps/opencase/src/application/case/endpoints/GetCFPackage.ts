import type { CFPackageRepository } from '../ports/CFPackageRepository'
import type { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { LinkData } from '../../../domain/case/value-objects/LinkData'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'

export interface GetCFPackageQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  docId: SourcedId
  /** When set, load data from this version's storage but serialize using caseVersion semantics. */
  loadVersion?: CaseVersion
}

export class GetCFPackage {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute(query: GetCFPackageQuery) {
    const storageVersion = query.loadVersion ?? query.caseVersion
    logger.info({ query, storageVersion }, 'Executing GetCFPackage')
    const storageKey = this.store.resolveStorageKey(query.tenantId, storageVersion, query.docId)
    if (!storageKey) return null
    const pkg = await this.pkgRepo.load(query.tenantId, storageVersion, storageKey)
    logger.info({ pkg }, 'Loaded CFPackage')
    if (!pkg) return null

    // Note: Get by ID returns archived packages regardless - filtering only applies to list endpoints

    // Generate CFPackageURI for the document — uses caseVersion for URI generation
    const basePath = query.caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'
    const packageURI: LinkData = {
      title: 'CFPackage',
      identifier: query.docId,
      uri: `${basePath}/CFPackages/${query.docId}`
    }

    // Pass caseVersion to toJSON for correct field stripping (e.g. v1.0 omits v1.1-only fields)
    const serializeAs = query.loadVersion ? query.caseVersion : undefined
    const documentJSON = pkg.document.toJSON(serializeAs)
    // Add CFPackageURI if not already present
    if (!documentJSON.CFPackageURI) {
      documentJSON.CFPackageURI = packageURI
    }

    const result: any = {
      CFDocument: documentJSON,
      CFItems: pkg.items.map(i => i.toJSON(serializeAs)),
      CFAssociations: pkg.associations.map(a => a.toJSON(serializeAs))
    }

    // ── Build CFDefinitions (optional [0..1]) ────────────────────
    // Merge tenant-wide seed definitions with per-framework definitions,
    // then filter each category to only those actually referenced by
    // this package's document, items, and associations.
    const tenantDefs = this.store.getTenantDefinitions(query.tenantId, storageVersion)
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

    const filterByIds = (merged: any[], ids: Set<string>) => {
      if (ids.size === 0) return []
      return merged.filter((v: any) => {
        const id = (v?.identifier ?? v?.sourcedId) as string | undefined
        return id != null && ids.has(id)
      })
    }

    // --- Collect referenced identifiers from the package ---

    // CFLicenses: CFDocument.licenseURI + CFItem[].licenseURI
    const refLicenseIds = new Set<string>()
    const docLicenseId = documentJSON.licenseURI?.identifier as string | undefined
    if (docLicenseId) refLicenseIds.add(docLicenseId)

    // CFItemTypes: CFItem[].CFItemTypeURI.identifier
    const refItemTypeIds = new Set<string>()

    // CFSubjects: CFDocument.subjectURI[].identifier + CFItem[].subjectURI[].identifier
    const refSubjectIds = new Set<string>()
    const docSubjectURIs = documentJSON.subjectURI as any[] | undefined
    if (Array.isArray(docSubjectURIs)) {
      for (const s of docSubjectURIs) {
        const id = s?.identifier as string | undefined
        if (id) refSubjectIds.add(id)
      }
    }

    // CFConcepts: CFItem[].conceptKeywordsURI.identifier
    const refConceptIds = new Set<string>()

    for (const item of result.CFItems ?? []) {
      const it = item as any
      // licenseURI
      const licId = it?.licenseURI?.identifier as string | undefined
      if (licId) refLicenseIds.add(licId)
      // CFItemTypeURI
      const typeId = it?.CFItemTypeURI?.identifier as string | undefined
      if (typeId) refItemTypeIds.add(typeId)
      // subjectURI (array)
      if (Array.isArray(it?.subjectURI)) {
        for (const s of it.subjectURI) {
          const id = s?.identifier as string | undefined
          if (id) refSubjectIds.add(id)
        }
      }
      // conceptKeywordsURI (single link or array)
      const ckUri = it?.conceptKeywordsURI
      if (ckUri) {
        if (Array.isArray(ckUri)) {
          for (const c of ckUri) {
            const id = c?.identifier as string | undefined
            if (id) refConceptIds.add(id)
          }
        } else {
          const id = ckUri?.identifier as string | undefined
          if (id) refConceptIds.add(id)
        }
      }
    }

    // CFAssociationGroupings: CFAssociation[].CFAssociationGroupingURI.identifier
    const refGroupingIds = new Set<string>()
    for (const assoc of result.CFAssociations ?? []) {
      const a = assoc as any
      const groupId = a?.CFAssociationGroupingURI?.identifier as string | undefined
      if (groupId) refGroupingIds.add(groupId)
    }

    // --- Merge then filter to referenced only ---
    const mergedDefinitions: any = {
      CFConcepts: filterByIds(mergeById(tenantDefs.CFConcepts, frameworkDefs?.CFConcepts ?? []), refConceptIds),
      CFSubjects: filterByIds(mergeById(tenantDefs.CFSubjects, frameworkDefs?.CFSubjects ?? []), refSubjectIds),
      CFLicenses: filterByIds(mergeById(tenantDefs.CFLicenses, frameworkDefs?.CFLicenses ?? []), refLicenseIds),
      CFItemTypes: filterByIds(mergeById(tenantDefs.CFItemTypes, frameworkDefs?.CFItemTypes ?? []), refItemTypeIds),
      CFAssociationGroupings: filterByIds(mergeById(tenantDefs.CFAssociationGroupings, frameworkDefs?.CFAssociationGroupings ?? []), refGroupingIds),
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
      result.CFDefinitions = mergedDefinitions
    }

    // Add CFRubrics if present (optional field [0..*])
    if (pkg.rubrics && pkg.rubrics.length > 0) {
      result.CFRubrics = pkg.rubrics.map(r => r.toJSON(serializeAs))
    }

    // Add extensions if present (optional field [0..1])
    if (query.caseVersion === '1.1' && pkg.extensions) {
      result.extensions = pkg.extensions
    }

    return result
  }
}
