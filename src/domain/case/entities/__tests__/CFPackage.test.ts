import { CFPackage } from '../CFPackage';
import { CFDocument } from '../CFDocument';
import { CFItem } from '../CFItem';
import { CFAssociation } from '../CFAssociation';
import { CaseVersion, TenantId } from '../../value-objects/Identifiers';

describe('CFPackage', () => {
  const tenantId: TenantId = 'test-tenant';
  const caseVersion: CaseVersion = '1.1';

  const createDocument = (): CFDocument => {
    return CFDocument.create({
      tenantId,
      caseVersion,
      sourcedId: 'doc-123',
      title: 'Test Document',
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
    });
  };

  const createItem = (id: string): CFItem => {
    return CFItem.create({
      tenantId,
      caseVersion,
      sourcedId: id,
      fullStatement: `Statement for ${id}`
    });
  };

  const createAssociation = (id: string): CFAssociation => {
    return CFAssociation.create({
      tenantId,
      caseVersion,
      sourcedId: id,
      originNode: 'item-1',
      destinationNode: 'item-2',
      associationType: 'isChildOf'
    });
  };

  it('should create a CFPackage with document, items, associations, and rubrics', () => {
    const document = createDocument();
    const items = [createItem('item-1'), createItem('item-2')];
    const associations = [createAssociation('assoc-1')];
    const rubrics = [{ id: 'rubric-1', type: 'test' }];

    const pkg = new CFPackage({ document, items, associations, rubrics });

    expect(pkg.document).toBe(document);
    expect(pkg.items).toEqual(items);
    expect(pkg.associations).toEqual(associations);
    expect(pkg.rubrics).toEqual(rubrics);
  });

  it('should create a CFPackage with empty arrays', () => {
    const document = createDocument();
    const items: CFItem[] = [];
    const associations: CFAssociation[] = [];
    const rubrics: any[] = [];

    const pkg = new CFPackage({ document, items, associations, rubrics });

    expect(pkg.document).toBe(document);
    expect(pkg.items).toEqual([]);
    expect(pkg.associations).toEqual([]);
    expect(pkg.rubrics).toEqual([]);
  });

  it('should allow access to all package components', () => {
    const document = createDocument();
    const items = [createItem('item-1')];
    const associations = [createAssociation('assoc-1')];
    const rubrics = [{ id: 'rubric-1' }];

    const pkg = new CFPackage({ document, items, associations, rubrics });

    expect(pkg.document.sourcedId).toBe('doc-123');
    expect(pkg.items.length).toBe(1);
    expect(pkg.items[0].sourcedId).toBe('item-1');
    expect(pkg.associations.length).toBe(1);
    expect(pkg.associations[0].sourcedId).toBe('assoc-1');
    expect(pkg.rubrics.length).toBe(1);
  });
});

