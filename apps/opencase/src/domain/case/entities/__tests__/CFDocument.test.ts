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

    it('should rewrite licenseURI/CFPackageURI/subjectURI to the local host on import (POR-730)', () => {
      const raw = {
        sourcedId: 'doc-123',
        title: 'Test Document',
        lastChangeDateTime: '2024-01-01T00:00:00Z',
        licenseURI: {
          title: 'License',
          identifier: 'c0c0c0c0-0000-4000-a000-000000000002',
          uri: 'https://standards.example.org/ims/case/v1p0/CFLicenses/c0c0c0c0-0000-4000-a000-000000000002'
        },
        CFPackageURI: {
          title: 'Package',
          identifier: 'doc-123',
          uri: 'https://standards.example.org/ims/case/v1p0/CFPackages/doc-123'
        },
        subjectURI: [{
          title: 'Subject',
          identifier: 'c0c0c0c0-0000-4000-a000-000000000012',
          uri: 'https://standards.example.org/ims/case/v1p0/CFSubjects/c0c0c0c0-0000-4000-a000-000000000012'
        }]
      };

      const doc = CFDocument.fromRaw(tenantId, caseVersion, raw);
      const json = doc.toJSON();

      expect(json.licenseURI.uri).toBe('/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000002');
      expect(json.CFPackageURI.uri).toBe('/ims/case/v1p1/CFPackages/doc-123');
      expect(json.subjectURI[0].uri).toBe('/ims/case/v1p1/CFSubjects/c0c0c0c0-0000-4000-a000-000000000012');
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

    it('should include caseVersion when the document is CASE 1.1', () => {
      const props = {
        tenantId,
        caseVersion: '1.1' as CaseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      };

      const doc = CFDocument.create(props);
      const json = doc.toJSON();

      expect(json.caseVersion).toBe('1.1');
    });

    it('should not include caseVersion when the document is CASE 1.0', () => {
      const props = {
        tenantId,
        caseVersion: '1.0' as CaseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p0/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      };

      const doc = CFDocument.create(props);
      const json = doc.toJSON();

      expect(json.caseVersion).toBeUndefined();
    });

    it('should honor serializeAs override when downconverting a 1.1 document to 1.0', () => {
      const props = {
        tenantId,
        caseVersion: '1.1' as CaseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        frameworkType: 'Competency',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      };

      const doc = CFDocument.create(props);
      const json = doc.toJSON('1.0');

      expect(json.caseVersion).toBeUndefined();
      expect(json.frameworkType).toBeUndefined();
    });

    it('should honor serializeAs override when serving a 1.0 document via v1p1', () => {
      const props = {
        tenantId,
        caseVersion: '1.0' as CaseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p0/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      };

      const doc = CFDocument.create(props);
      const json = doc.toJSON('1.1');

      expect(json.caseVersion).toBe('1.1');
    });

    it('should strip 1.1-only fields (frameworkType, subjectURI, extensions) for CASE 1.0', () => {
      const props = {
        tenantId,
        caseVersion: '1.1' as CaseVersion,
        sourcedId: 'doc-123',
        uri: '/ims/case/v1p1/CFDocuments/doc-123',
        creator: 'Test Creator',
        title: 'Test Document',
        frameworkType: 'Competency',
        subjectURI: [{ identifier: 'subj-1', uri: '/ims/case/v1p1/CFItems/subj-1', title: 'Subject' }],
        extensions: { custom: { key: 'value' } },
        lastChangeDateTime: new Date('2024-01-01T00:00:00Z')
      };

      const doc = CFDocument.create(props);
      const json = doc.toJSON('1.0');

      expect(json.frameworkType).toBeUndefined();
      expect(json.subjectURI).toBeUndefined();
      expect(json.extensions).toBeUndefined();
    });
  });
});

