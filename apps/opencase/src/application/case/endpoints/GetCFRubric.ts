import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import { CFRubric } from '../../../domain/case/entities/CFRubric'

export interface GetCFRubricQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFRubric {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (query: GetCFRubricQuery) {
    //logger.info({ query }, 'Executing GetCFRubric')

    // Search through all documents to find the rubric
    const documents = this.store.getAllDocuments(query.tenantId, query.caseVersion)
    
    for (const docMeta of documents) {
      const pkg = await this.pkgRepo.load(query.tenantId, query.caseVersion, docMeta.sourcedId)
      if (!pkg) continue

      const rubric = pkg.rubrics.find((r: CFRubric) => {
        return r.identifier === query.sourcedId
      })

      if (rubric) {
        return {
          CFRubric: rubric.toJSON()
        }
      }
    }

    return null
  }
}













