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
        fullStatement: 'Test statement'
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
        fullStatement: 'Test statement'
      };

      expect(() => CFItem.create(props)).toThrow('CFItem.sourcedId is required');
    });

    it('should throw error when fullStatement is missing', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'item-123',
        fullStatement: ''
      };

      expect(() => CFItem.create(props)).toThrow('CFItem.fullStatement is required');
    });

    it('should create item with optional fields', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'item-123',
        fullStatement: 'Test statement',
        humanCodingScheme: 'MATH.1',
        listEnumInSource: 'enum1',
        notes: 'Test notes',
        language: 'en',
        extensions: [{ type: 'custom', data: { key: 'value' } }]
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

      const item = CFItem.fromRaw(tenantId, caseVersion, raw);

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
        fullStatement: 'Test statement',
        humanCodingScheme: 'MATH.1',
        language: 'en'
      };

      const item = CFItem.create(props);
      const json = item.toJSON();

      expect(json.sourcedId).toBe('item-123');
      expect(json.fullStatement).toBe('Test statement');
      expect(json.humanCodingScheme).toBe('MATH.1');
      expect(json.language).toBe('en');
      expect(json.tenantId).toBe(tenantId);
      expect(json.caseVersion).toBe(caseVersion);
    });
  });
});

