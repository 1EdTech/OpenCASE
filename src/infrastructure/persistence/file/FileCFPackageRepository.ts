import { CFPackageRepository } from '../../../application/case/ports/CFPackageRepository';
import { CFPackage } from '../../../domain/case/entities/CFPackage';
import { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers';
import { FileFrameworkStore } from './FileFrameworkStore';
import { CFDocument } from '../../../domain/case/entities/CFDocument';
import { CFItem } from '../../../domain/case/entities/CFItem';
import { CFAssociation } from '../../../domain/case/entities/CFAssociation';

export class FileCFPackageRepository implements CFPackageRepository {
  constructor(private readonly store: FileFrameworkStore) {}

  async load(
    tenantId: TenantId,
    version: CaseVersion,
    docId: SourcedId
  ): Promise<CFPackage | null> {
    const bundle = await this.store.loadDocumentBundle(tenantId, version, docId);
    if (!bundle) return null;

    const document = CFDocument.fromRaw(tenantId, version, bundle.document);
    const items = (bundle.items ?? []).map((i: any) =>
      CFItem.fromRaw(tenantId, version, i)
    );
    const associations = (bundle.associations ?? []).map((a: any) =>
      CFAssociation.fromRaw(tenantId, version, a)
    );
    const rubrics = bundle.rubrics ?? [];

    return new CFPackage({ document, items, associations, rubrics });
  }

  async saveNewVersion(
    tenantId: TenantId,
    version: CaseVersion,
    pkg: CFPackage
  ): Promise<void> {
    const docId = pkg.document.sourcedId;
    const bundle = {
      document: pkg.document.toJSON(),
      items: pkg.items.map(i => i.toJSON()),
      associations: pkg.associations.map(a => a.toJSON()),
      rubrics: pkg.rubrics
    };

    await this.store.writeBundleFile(tenantId, version, docId, bundle);

    // NOTE: you still need logic to update documents.json / items.json / associations.json
    // You can add that later in FileFrameworkStore or a separate IndexIO helper.
  }
}

