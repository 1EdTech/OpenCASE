import { CFPackageRepository } from '../ports/CFPackageRepository';
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers';
import { CFDocument } from '../../../domain/case/entities/CFDocument';
import { CFItem } from '../../../domain/case/entities/CFItem';
import { CFAssociation } from '../../../domain/case/entities/CFAssociation';
import { CFPackage } from '../../../domain/case/entities/CFPackage';

export interface CreateFrameworkCommand {
  tenantId: TenantId;
  caseVersion: CaseVersion;
  payload: {
    document: any;
    items?: any[];
    associations?: any[];
    rubrics?: any[];
  };
}

export class CreateFramework {
  constructor(private readonly pkgRepo: CFPackageRepository) {}

  async execute(cmd: CreateFrameworkCommand): Promise<void> {
    const { tenantId, caseVersion, payload } = cmd;

    const document = CFDocument.fromRaw(tenantId, caseVersion, payload.document);
    const items = (payload.items ?? []).map(i => CFItem.fromRaw(tenantId, caseVersion, i));
    const associations = (payload.associations ?? []).map(a =>
      CFAssociation.fromRaw(tenantId, caseVersion, a)
    );
    const rubrics = payload.rubrics ?? [];

    const pkg = new CFPackage({ document, items, associations, rubrics });

    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg);
  }
}

