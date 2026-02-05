import { CFItem } from '../CFItem';
import { CaseVersion, TenantId } from '../../value-objects/Identifiers';

describe('CFItem', () => {
  const tenantId: TenantId = 'test-tenant';
  const caseVersion: CaseVersion = '1.1';

  describe('create', () => {
    it('should create a CFItem with valid props', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'item-123',
        uri: '/ims/case/v1p1/CFItems/item-123',
        fullStatement: 'Test statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'Document',
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123'
        }
      };

      const item = CFItem.create(props);

      expect(item).toBeInstanceOf(CFItem);
      expect(item.sourcedId).toBe('item-123');
    });

    it('should throw error when sourcedId is missing', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: '',
        uri: '/ims/case/v1p1/CFItems/item-123',
        fullStatement: 'Test statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'Document',
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123'
        }
      };

      expect(() => CFItem.create(props)).toThrow('CFItem.sourcedId is required');
    });

    it('should throw error when fullStatement is missing', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'item-123',
        uri: '/ims/case/v1p1/CFItems/item-123',
        fullStatement: '',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'Document',
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123'
        }
      };

      expect(() => CFItem.create(props)).toThrow('CFItem.fullStatement is required');
    });

    it('should create item with optional fields', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'item-123',
        uri: '/ims/case/v1p1/CFItems/item-123',
        fullStatement: 'Test statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'Document',
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123'
        },
        humanCodingScheme: 'MATH.1',
        listEnumInSource: 'enum1',
        notes: 'Test notes',
        language: 'en',
        extensions: { custom: { key: 'value' } }
      };

      const item = CFItem.create(props);
      expect(item.sourcedId).toBe('item-123');
    });
  });

  describe('fromRaw', () => {
    it('should create CFItem from raw data', () => {
      const raw = {
        sourcedId: 'item-123',
        fullStatement: 'Test statement',
        humanCodingScheme: 'MATH.1'
      };

      const item = CFItem.fromRaw(tenantId, caseVersion, raw, 'doc-123', '/ims/case/v1p1/CFDocuments/doc-123');

      expect(item.sourcedId).toBe('item-123');
      expect(item.toJSON().fullStatement).toBe('Test statement');
      expect(item.toJSON().humanCodingScheme).toBe('MATH.1');
    });
  });

  describe('toJSON', () => {
    it('should serialize item to JSON', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'item-123',
        uri: '/ims/case/v1p1/CFItems/item-123',
        fullStatement: 'Test statement',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        CFDocumentURI: {
          title: 'Document',
          identifier: 'doc-123',
          uri: '/ims/case/v1p1/CFDocuments/doc-123'
        },
        humanCodingScheme: 'MATH.1',
        language: 'en'
      };

      const item = CFItem.create(props);
      const json = item.toJSON();

      expect(json.identifier).toBe('item-123');
      expect(json.fullStatement).toBe('Test statement');
      expect(json.humanCodingScheme).toBe('MATH.1');
      expect(json.language).toBe('en');
      expect(json.tenantId).toBeUndefined();
      expect(json.caseVersion).toBeUndefined();
      expect(json.sourcedId).toBeUndefined();
    });
  });
});

