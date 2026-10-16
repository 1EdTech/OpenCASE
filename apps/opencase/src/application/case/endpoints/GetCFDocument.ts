import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { buildCFPackageURI, getOpenCaseExtension } from '../services/packageUri'

export interface GetCFDocumentQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
  /** When set, load data from this version's storage but serialize using caseVersion semantics. */
  loadVersion?: CaseVersion
}

export class GetCFDocument {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFDocumentQuery) {
    //logger.info({ query }, 'Executing GetCFDocument')

    // Load the package — use loadVersion for storage access if provided
    const storageVersion = query.loadVersion ?? query.caseVersion
    const storageKey = this.store.resolveStorageKey(query.tenantId, storageVersion, query.sourcedId)
    if (!storageKey) return null
    const pkg = await this.pkgRepo.load(query.tenantId, storageVersion, storageKey)
    if (!pkg) return null

    // Note: Get by ID returns archived documents regardless - filtering only applies to list endpoints

    // Pass caseVersion to toJSON for correct field stripping when downconverting
    const serializeAs = query.loadVersion ? query.caseVersion : undefined
    const documentJSON = pkg.document.toJSON(serializeAs)
    documentJSON.CFPackageURI = buildCFPackageURI(
      query.sourcedId,
      query.caseVersion,
      getOpenCaseExtension(pkg.document.extensions)
    )

    return documentJSON
  }
}













