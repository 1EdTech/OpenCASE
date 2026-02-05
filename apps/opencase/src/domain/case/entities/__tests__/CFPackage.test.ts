import { CFPackage } from '../CFPackage';
import { CFDocument } from '../CFDocument';
import { CFItem } from '../CFItem';
import { CFAssociation } from '../CFAssociation';
import { CFRubric } from '../CFRubric';
import { CaseVersion, TenantId } from '../../value-objects/Identifiers';

describe('CFPackage', () => {
  const tenantId: TenantId = 'test-tenant';
  const caseVersion: CaseVersion = '1.1';

  const createDocument = (): CFDocument => {
    return CFDocument.create({
      tenantId,
      caseVersion,
      sourcedId: 'doc-123',
      uri: '/ims/case/v1p1/CFDocuments/doc-123',
      creator: 'Test Creator',
      title: 'Test Document',
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
    });
  };

  const createItem = (id: string): CFItem => {
    return CFItem.create({
      tenantId,
      caseVersion,
      sourcedId: id,
      uri: `/ims/case/v1p1/CFItems/${id}`,
      fullStatement: `Statement for ${id}`,
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
      CFDocumentURI: {
        title: 'Document',
        identifier: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123'
      }
    });
  };

  const createAssociation = (id: string): CFAssociation => {
    return CFAssociation.create({
      tenantId,
      caseVersion,
      sourcedId: id,
      uri: `/ims/case/v1p1/CFAssociations/${id}`,
      associationType: 'isChildOf',
      originNodeURI: {
        title: 'Item 1',
        identifier: 'item-1',
        uri: '/ims/case/v1p1/CFItems/item-1'
      },
      destinationNodeURI: {
        title: 'Item 2',
        identifier: 'item-2',
        uri: '/ims/case/v1p1/CFItems/item-2'
      },
      lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
    });
  };

  it('should create a CFPackage with document, items, associations, and rubrics', () => {
    const document = createDocument();
    const items = [createItem('item-1'), createItem('item-2')];
    const associations = [createAssociation('assoc-1')];
    const rubrics = [CFRubric.fromRaw(tenantId, caseVersion, { identifier: 'rubric-1', uri: '/ims/case/v1p1/CFRubrics/rubric-1', lastChangeDateTime: '2024-01-01T00:00:00Z', title: 'test' })];

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
    const rubrics = [CFRubric.fromRaw(tenantId, caseVersion, { identifier: 'rubric-1', uri: '/ims/case/v1p1/CFRubrics/rubric-1', lastChangeDateTime: '2024-01-01T00:00:00Z' })];

    const pkg = new CFPackage({ document, items, associations, rubrics });

    expect(pkg.document.sourcedId).toBe('doc-123');
    expect(pkg.items.length).toBe(1);
    expect(pkg.items[0].sourcedId).toBe('item-1');
    expect(pkg.associations.length).toBe(1);
    expect(pkg.associations[0].sourcedId).toBe('assoc-1');
    expect(pkg.rubrics.length).toBe(1);
    expect(pkg.rubrics[0].identifier).toBe('rubric-1');
  });
});

