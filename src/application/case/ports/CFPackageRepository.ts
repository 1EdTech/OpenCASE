import { CFPackage } from '../../../domain/case/entities/CFPackage';
import { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers';

export interface CFPackageRepository {
  load(tenantId: TenantId, version: CaseVersion, docId: SourcedId): Promise<CFPackage | null>;
  saveNewVersion(
    tenantId: TenantId,
    version: CaseVersion,
    pkg: CFPackage
  ): Promise<void>;
}

