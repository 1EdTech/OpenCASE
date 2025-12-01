import { CFPackageRepository } from '../ports/CFPackageRepository';
import { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers';

export interface GetCFPackageQuery {
  tenantId: TenantId;
  caseVersion: CaseVersion;
  docId: SourcedId;
}

export class GetCFPackage {
  constructor(private readonly pkgRepo: CFPackageRepository) {}

  async execute(query: GetCFPackageQuery) {
    const pkg = await this.pkgRepo.load(query.tenantId, query.caseVersion, query.docId);
    if (!pkg) return null;

    return {
      CFPackage: {
        CFDocument: pkg.document.toJSON(),
        CFItems: pkg.items.map(i => i.toJSON()),
        CFAssociations: pkg.associations.map(a => a.toJSON()),
        CFRubrics: pkg.rubrics // TODO: proper rubric entities
      }
    };
  }
}

