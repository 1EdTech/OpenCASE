import { CFAssociation } from '../CFAssociation';
import { CaseVersion, TenantId } from '../../value-objects/Identifiers';

describe('CFAssociation', () => {
  const tenantId: TenantId = 'test-tenant';
  const caseVersion: CaseVersion = '1.1';

  describe('create', () => {
    it('should create a CFAssociation with valid props', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'assoc-123',
        originNode: 'item-1',
        destinationNode: 'item-2',
        associationType: 'isChildOf'
      };

      const assoc = CFAssociation.create(props);

      expect(assoc).toBeInstanceOf(CFAssociation);
      expect(assoc.sourcedId).toBe('assoc-123');
    });

    it('should throw error when sourcedId is missing', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: '',
        originNode: 'item-1',
        destinationNode: 'item-2',
        associationType: 'isChildOf'
      };

      expect(() => CFAssociation.create(props)).toThrow('CFAssociation.sourcedId is required');
    });

    it('should create association with optional fields', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'assoc-123',
        originNode: 'item-1',
        destinationNode: 'item-2',
        associationType: 'isChildOf',
        sequenceNumber: 1,
        extensions: [{ type: 'custom', data: { key: 'value' } }]
      };

      const assoc = CFAssociation.create(props);
      expect(assoc.sourcedId).toBe('assoc-123');
    });
  });

  describe('fromRaw', () => {
    it('should create CFAssociation from raw data', () => {
      const raw = {
        sourcedId: 'assoc-123',
        originNode: 'item-1',
        destinationNode: 'item-2',
        associationType: 'isChildOf',
        sequenceNumber: 1
      };

      const assoc = CFAssociation.fromRaw(tenantId, caseVersion, raw);

      expect(assoc.sourcedId).toBe('assoc-123');
      expect(assoc.toJSON().originNode).toBe('item-1');
      expect(assoc.toJSON().destinationNode).toBe('item-2');
      expect(assoc.toJSON().associationType).toBe('isChildOf');
      expect(assoc.toJSON().sequenceNumber).toBe(1);
    });
  });

  describe('toJSON', () => {
    it('should serialize association to JSON', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'assoc-123',
        originNode: 'item-1',
        destinationNode: 'item-2',
        associationType: 'isChildOf',
        sequenceNumber: 1
      };

      const assoc = CFAssociation.create(props);
      const json = assoc.toJSON();

      expect(json.sourcedId).toBe('assoc-123');
      expect(json.originNode).toBe('item-1');
      expect(json.destinationNode).toBe('item-2');
      expect(json.associationType).toBe('isChildOf');
      expect(json.sequenceNumber).toBe(1);
      expect(json.tenantId).toBe(tenantId);
      expect(json.caseVersion).toBe(caseVersion);
    });
  });
});

