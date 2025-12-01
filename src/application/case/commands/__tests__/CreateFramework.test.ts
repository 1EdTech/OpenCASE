import { CreateFramework } from '../CreateFramework';
import { CFPackageRepository } from '../../ports/CFPackageRepository';
import { CFDocument } from '../../../../domain/case/entities/CFDocument';
import { CFItem } from '../../../../domain/case/entities/CFItem';
import { CFAssociation } from '../../../../domain/case/entities/CFAssociation';

describe('CreateFramework', () => {
  let mockRepository: jest.Mocked<CFPackageRepository>;
  let createFramework: CreateFramework;

  beforeEach(() => {
    mockRepository = {
      load: jest.fn(),
      saveNewVersion: jest.fn().mockResolvedValue(undefined)
    } as any;

    createFramework = new CreateFramework(mockRepository);
  });

  describe('execute', () => {
    const tenantId = 'test-tenant';
    const caseVersion = '1.1';

    it('should create and save a framework with all components', async () => {
      const payload = {
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        items: [
          {
            sourcedId: 'item-1',
            fullStatement: 'Statement 1'
          },
          {
            sourcedId: 'item-2',
            fullStatement: 'Statement 2'
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
        rubrics: [{ id: 'rubric-1', type: 'test' }]
      };

      await createFramework.execute({ tenantId, caseVersion, payload });

      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1);
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2];

      expect(savedPkg.document.sourcedId).toBe('doc-123');
      expect(savedPkg.items).toHaveLength(2);
      expect(savedPkg.items[0].sourcedId).toBe('item-1');
      expect(savedPkg.items[1].sourcedId).toBe('item-2');
      expect(savedPkg.associations).toHaveLength(1);
      expect(savedPkg.associations[0].sourcedId).toBe('assoc-1');
      expect(savedPkg.rubrics).toEqual([{ id: 'rubric-1', type: 'test' }]);
    });

    it('should handle missing optional arrays', async () => {
      const payload = {
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      };

      await createFramework.execute({ tenantId, caseVersion, payload });

      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1);
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2];

      expect(savedPkg.items).toEqual([]);
      expect(savedPkg.associations).toEqual([]);
      expect(savedPkg.rubrics).toEqual([]);
    });

    it('should handle empty arrays', async () => {
      const payload = {
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        },
        items: [],
        associations: [],
        rubrics: []
      };

      await createFramework.execute({ tenantId, caseVersion, payload });

      expect(mockRepository.saveNewVersion).toHaveBeenCalledTimes(1);
      const savedPkg = mockRepository.saveNewVersion.mock.calls[0][2];

      expect(savedPkg.items).toEqual([]);
      expect(savedPkg.associations).toEqual([]);
      expect(savedPkg.rubrics).toEqual([]);
    });

    it('should propagate errors from repository', async () => {
      const payload = {
        document: {
          sourcedId: 'doc-123',
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      };

      const error = new Error('Repository error');
      mockRepository.saveNewVersion.mockRejectedValue(error);

      await expect(
        createFramework.execute({ tenantId, caseVersion, payload })
      ).rejects.toThrow('Repository error');
    });

    it('should propagate validation errors from domain entities', async () => {
      const payload = {
        document: {
          sourcedId: '', // Invalid: empty sourcedId
          title: 'Test Document',
          lastChangeDateTime: '2024-01-01T00:00:00Z'
        }
      };

      await expect(
        createFramework.execute({ tenantId, caseVersion, payload })
      ).rejects.toThrow('CFDocument.sourcedId is required');
    });
  });
});

