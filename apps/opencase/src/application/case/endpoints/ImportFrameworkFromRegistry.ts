import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CredentialRegistryClient } from '../../../infrastructure/http/CredentialRegistryClient'
import { mapCtdlGraphToCasePackage } from '../../../infrastructure/ctdlasn/CtdlAsnToCaseMapper'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { logger } from '../../../infrastructure/logging/Logger'

export interface ImportFrameworkFromRegistryCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  registryUrl: string
}

export interface ImportFrameworkFromRegistryResult {
  docId: string
  version: number
  itemCount: number
  associationCount: number
}

export class ImportFrameworkFromRegistry {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly registryClient: CredentialRegistryClient
  ) {}

  async execute (cmd: ImportFrameworkFromRegistryCommand): Promise<ImportFrameworkFromRegistryResult> {
    const { tenantId, caseVersion, registryUrl } = cmd

    logger.info({ tenantId, caseVersion, registryUrl }, 'Importing framework from Credential Registry')

    const graph = await this.registryClient.fetchGraph(registryUrl)
    const raw = mapCtdlGraphToCasePackage(graph)

    const document = CFDocument.fromRaw(tenantId, caseVersion, raw.CFDocument)
    const docId = document.sourcedId
    const docURI = document.toJSON().uri

    const items = raw.CFItems.map(i =>
      CFItem.fromRaw(tenantId, caseVersion, i, docId, docURI)
    )
    const associations = raw.CFAssociations.map(a =>
      CFAssociation.fromRaw(tenantId, caseVersion, a)
    )

    const pkg = new CFPackage({ document, items, associations, rubrics: [], definitions: null })
    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg)

    logger.info(
      { tenantId, caseVersion, docId, itemCount: items.length, associationCount: associations.length },
      'Successfully imported framework from Credential Registry'
    )

    return {
      docId,
      version: 1,
      itemCount: items.length,
      associationCount: associations.length
    }
  }
}
