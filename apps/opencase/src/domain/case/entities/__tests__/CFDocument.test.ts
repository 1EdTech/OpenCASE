import { CFDocument } from '../CFDocument';
import { CaseVersion, TenantId } from '../../value-objects/Identifiers';

describe('CFDocument', () => {
  const tenantId: TenantId = 'test-tenant';
  const caseVersion: CaseVersion = '1.1';

  describe('create', () => {
    it('should create a CFDocument with valid props', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      };

      const doc = CFDocument.create(props);

      expect(doc).toBeInstanceOf(CFDocument);
      expect(doc.sourcedId).toBe('doc-123');
      expect(doc.tenantId).toBe(tenantId);
      expect(doc.caseVersion).toBe(caseVersion);
    });

    it('should throw error when sourcedId is missing', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: '',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date()
      };

      expect(() => CFDocument.create(props)).toThrow('CFDocument.sourcedId is required');
    });

    it('should throw error when title is missing', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: '',
        lastChangeDateTime: new Date()
      };

      expect(() => CFDocument.create(props)).toThrow('CFDocument.title is required');
    });

    it('should create document with optional fields', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        description: 'Test description',
        subject: 'Mathematics',
        language: 'en',
        frameworkType: 'Competency',
        version: '1.0',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        adoptionStatus: 'adopted',
        licenceUri: 'https://example.com/license',
        notes: 'Test notes',
        extensions: { custom: { key: 'value' } }
      };

      const doc = CFDocument.create(props);
      expect(doc.sourcedId).toBe('doc-123');
    });
  });

  describe('fromRaw', () => {
    it('should create CFDocument from raw data', () => {
      const raw = {
        sourcedId: 'doc-123',
        title: 'Test Document',
        lastChangeDateTime: '2024-01-01T00:00:00Z',
        description: 'Test description',
        subject: 'Mathematics'
      };

      const doc = CFDocument.fromRaw(tenantId, caseVersion, raw);

      expect(doc.sourcedId).toBe('doc-123');
      expect(doc.toJSON().title).toBe('Test Document');
      expect(doc.tenantId).toBe(tenantId);
      expect(doc.caseVersion).toBe(caseVersion);
    });

    it('should convert ISO string to Date object', () => {
      const raw = {
        sourcedId: 'doc-123',
        title: 'Test Document',
        lastChangeDateTime: '2024-01-01T12:30:45Z'
      };

      const doc = CFDocument.fromRaw(tenantId, caseVersion, raw);
      const json = doc.toJSON();

      expect(json.lastChangeDateTime).toBe('2024-01-01T12:30:45.000Z');
    });
  });

  describe('toJSON', () => {
    it('should serialize document to JSON with ISO date', () => {
      const date = new Date('2024-01-01T12:30:45Z');
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: date
      };

      const doc = CFDocument.create(props);
      const json = doc.toJSON();

      expect(json.identifier).toBe('doc-123');
      expect(json.title).toBe('Test Document');
      expect(json.lastChangeDateTime).toBe('2024-01-01T12:30:45.000Z');
      expect(json.tenantId).toBeUndefined();
      expect(json.caseVersion).toBeUndefined();
      expect(json.sourcedId).toBeUndefined();
    });

    it('should include all optional fields in JSON', () => {
      const props = {
        tenantId,
        caseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        description: 'Test description',
        subject: 'Mathematics',
        language: 'en',
        frameworkType: 'Competency',
        version: '1.0',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z'),
        adoptionStatus: 'adopted',
        licenceUri: 'https://example.com/license',
        notes: 'Test notes',
        extensions: { custom: { key: 'value' } }
      };

      const doc = CFDocument.create(props);
      const json = doc.toJSON();

      expect(json.description).toBe('Test description');
      expect(json.subject).toBe('Mathematics');
      expect(json.language).toBe('en');
      expect(json.frameworkType).toBe('Competency');
      expect(json.version).toBe('1.0');
      expect(json.adoptionStatus).toBe('adopted');
      expect(json.notes).toBe('Test notes');
      expect(json.extensions).toEqual({ custom: { key: 'value' } });
    });
  });
});

