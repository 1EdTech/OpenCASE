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
        uri: '/ims/case/v1p1/CFAssociations/assoc-123',
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
        uri: '/ims/case/v1p1/CFAssociations/assoc-123',
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
      };

      expect(() => CFAssociation.create(props)).toThrow('CFAssociation.sourcedId is required');
    });

    it('should create association with optional fields', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'assoc-123',
        uri: '/ims/case/v1p1/CFAssociations/assoc-123',
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
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        sequenceNumber: 1,
        extensions: { custom: { key: 'value' } }
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
      expect(assoc.toJSON().originNodeURI).toBeDefined();
      expect(assoc.toJSON().destinationNodeURI).toBeDefined();
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
        uri: '/ims/case/v1p1/CFAssociations/assoc-123',
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
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        sequenceNumber: 1
      };

      const assoc = CFAssociation.create(props);
      const json = assoc.toJSON();

      expect(json.identifier).toBe('assoc-123');
      expect(json.originNodeURI).toBeDefined();
      expect(json.destinationNodeURI).toBeDefined();
      expect(json.associationType).toBe('isChildOf');
      expect(json.sequenceNumber).toBe(1);
      expect(json.tenantId).toBeUndefined();
      expect(json.caseVersion).toBeUndefined();
      expect(json.sourcedId).toBeUndefined();
    });
  });
});

