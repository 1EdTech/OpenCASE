import { FileCFPackageRepository } from '../FileCFPackageRepository';
import { FileFrameworkStore } from '../FileFrameworkStore';
import { CFPackage } from '../../../../domain/case/entities/CFPackage';
import { CFDocument } from '../../../../domain/case/entities/CFDocument';
import { CFItem } from '../../../../domain/case/entities/CFItem';
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation';
import { CFRubric } from '../../../../domain/case/entities/CFRubric';

describe('FileCFPackageRepository', () => {
  let repository: FileCFPackageRepository;
  let mockStore: jest.Mocked<FileFrameworkStore>;

  beforeEach(() => {
    mockStore = {
      loadDocumentBundle: jest.fn(),
      assertNoEntityIdReuse: jest.fn(),
      writeBundleFile: jest.fn(),
      updateIndexesForBundle: jest.fn().mockResolvedValue(undefined)
    } as any;

    repository = new FileCFPackageRepository(mockStore);
  });

  describe('load', () => {
    const tenantId = 'test-tenant';
    const version = '1.1';
    const docId = 'doc-123';

    it('should return null when bundle is not found', async () => {
      mockStore.loadDocumentBundle.mockResolvedValue(null);

      const result = await repository.load(tenantId, version, docId);

      expect(result).toBeNull();
      expect(mockStore.loadDocumentBundle).toHaveBeenCalledWith(tenantId, version, docId);
    });

    it('should load and construct CFPackage from bundle', async () => {
      const bundle = {
        document: {
          sourcedId: docId,
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        items: [
          {
            sourcedId: 'item-1',
            fullStatement: 'Statement 1'
          }
        ],
        associations: [
          {
            sourcedId: 'assoc-1',
            originNode: 'item-1',
            destinationNode: 'item-2',
            associationType: 'isChildOf'
          }
        ],
        rubrics: [{ id: 'rubric-1' }]
      };

      mockStore.loadDocumentBundle.mockResolvedValue(bundle);

      const result = await repository.load(tenantId, version, docId);

      expect(result).toBeInstanceOf(CFPackage);
      expect(result?.document.sourcedId).toBe(docId);
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0].sourcedId).toBe('item-1');
      expect(result?.associations).toHaveLength(1);
      expect(result?.associations[0].sourcedId).toBe('assoc-1');
      expect(result?.rubrics).toHaveLength(1);
      expect(result?.rubrics[0].identifier).toBe('rubric-1');
    });

    it('should handle empty items and associations', async () => {
      const bundle = {
        document: {
          sourcedId: docId,
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      };

      mockStore.loadDocumentBundle.mockResolvedValue(bundle);

      const result = await repository.load(tenantId, version, docId);

      expect(result).toBeInstanceOf(CFPackage);
      expect(result?.items).toEqual([]);
      expect(result?.associations).toEqual([]);
      expect(result?.rubrics).toEqual([]);
    });

    it('should handle null/undefined items and associations', async () => {
      const bundle = {
        document: {
          sourcedId: docId,
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        items: null,
        associations: undefined
      };

      mockStore.loadDocumentBundle.mockResolvedValue(bundle as any);

      const result = await repository.load(tenantId, version, docId);

      expect(result).toBeInstanceOf(CFPackage);
      expect(result?.items).toEqual([]);
      expect(result?.associations).toEqual([]);
    });
  });

  describe('saveNewVersion', () => {
    const tenantId = 'test-tenant';
    const version = '1.1';

    it('should save package as bundle file', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion: version,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      });

      const docURI = document.toJSON().uri;

      const item = CFItem.create({
        tenantId,
        caseVersion: version,
        sourcedId: 'item-1',
        uri: '/ims/case/v1p1/CFItems/item-1',
        fullStatement: 'Statement 1',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'Document',
          identifier: 'doc-123',
          uri: docURI
        }
      });

      const association = CFAssociation.create({
        tenantId,
        caseVersion: version,
        sourcedId: 'assoc-1',
        uri: '/ims/case/v1p1/CFAssociations/assoc-1',
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

      const rubric = CFRubric.fromRaw(tenantId, version, {
        identifier: 'rubric-1',
        uri: `/ims/case/${version}/CFRubrics/rubric-1`,
        lastChangeDateTime: '2024-01-01T00:00:00Z'
      });
      const pkg = new CFPackage({
        document,
        items: [item],
        associations: [association],
        rubrics: [rubric]
      });

      const relativePath = 'frameworks/doc-123/doc-123_v0001.json';
      mockStore.writeBundleFile.mockResolvedValue({ relativePath });

      await repository.saveNewVersion(tenantId, version, pkg);

      expect(mockStore.writeBundleFile).toHaveBeenCalledWith(
        tenantId,
        version,
        'doc-123',
        {
          document: document.toJSON(),
          items: [item.toJSON()],
          associations: [association.toJSON()],
          rubrics: [rubric.toJSON()]
        }
      );
      expect(mockStore.updateIndexesForBundle).toHaveBeenCalledWith(
        tenantId,
        version,
        {
          document: document.toJSON(),
          items: [item.toJSON()],
          associations: [association.toJSON()],
          rubrics: [rubric.toJSON()]
        },
        relativePath
      );
    });

    it('should handle empty arrays', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion: version,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      });

      const pkg = new CFPackage({
        document,
        items: [],
        associations: [],
        rubrics: []
      });

      const relativePath = 'frameworks/doc-123/doc-123_v0001.json';
      mockStore.writeBundleFile.mockResolvedValue({ relativePath });

      await repository.saveNewVersion(tenantId, version, pkg);

      expect(mockStore.writeBundleFile).toHaveBeenCalledWith(
        tenantId,
        version,
        'doc-123',
        {
          document: document.toJSON(),
          items: [],
          associations: [],
          rubrics: []
        }
      );
      expect(mockStore.updateIndexesForBundle).toHaveBeenCalledWith(
        tenantId,
        version,
        {
          document: document.toJSON(),
          items: [],
          associations: [],
          rubrics: []
        },
        relativePath
      );
    });

    it('should propagate errors from store', async () => {
      const document = CFDocument.create({
        tenantId,
        caseVersion: version,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      });

      const pkg = new CFPackage({
        document,
        items: [],
        associations: [],
        rubrics: []
      });

      const error = new Error('File system error');
      mockStore.writeBundleFile.mockRejectedValue(error);

      await expect(
        repository.saveNewVersion(tenantId, version, pkg)
      ).rejects.toThrow('File system error');
    });
  });
});

