import { type CFPackageRepository } from '../ports/CFPackageRepository'
import { type CaseVersion, type SourcedId, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { type LinkData } from '../../../domain/case/value-objects/LinkData'

export interface GetCFDocumentQuery {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: SourcedId
}

export class GetCFDocument {
  constructor (private readonly pkgRepo: CFPackageRepository) {}

  async execute (query: GetCFDocumentQuery) {
    //logger.info({ query }, 'Executing GetCFDocument')
    
    // Load the package containing this document
    const pkg = await this.pkgRepo.load(query.tenantId, query.caseVersion, query.sourcedId)
    if (!pkg) return null

    // Note: Get by ID returns archived documents regardless - filtering only applies to list endpoints

    // Generate CFPackageURI for the document
    const basePath = query.caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'
    const packageURI: LinkData = {
      title: 'CFPackage',
      identifier: query.sourcedId,
      uri: `${basePath}/CFPackages/${query.sourcedId}`
    }

    const documentJSON = pkg.document.toJSON()
    // Add CFPackageURI if not already present
    if (!documentJSON.CFPackageURI) {
      documentJSON.CFPackageURI = packageURI
    }

    return {
      CFDocument: documentJSON
    }
  }
}













