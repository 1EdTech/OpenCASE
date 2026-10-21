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

    it('should rewrite originNodeURI/destinationNodeURI to the local host on import, even when the source supplied absolute foreign-host URLs (POR-730)', () => {
      const raw = {
        sourcedId: 'assoc-123',
        uri: 'https://standards.example.org/ims/case/v1p0/CFAssociations/assoc-123',
        associationType: 'isChildOf',
        originNodeURI: {
          title: 'Item 1',
          identifier: 'item-1',
          uri: 'https://standards.example.org/ims/case/v1p0/CFItems/item-1'
        },
        destinationNodeURI: {
          title: 'Item 2',
          identifier: 'item-2',
          uri: 'https://standards.example.org/ims/case/v1p0/CFItems/item-2'
        }
      };

      const assoc = CFAssociation.fromRaw(tenantId, caseVersion, raw);
      const json = assoc.toJSON();

      expect(json.uri).toBe('/ims/case/v1p1/CFAssociations/assoc-123');
      expect(json.originNodeURI.uri).toBe('/ims/case/v1p1/CFItems/item-1');
      expect(json.destinationNodeURI.uri).toBe('/ims/case/v1p1/CFItems/item-2');
      // identifiers are preserved from the source
      expect(json.originNodeURI.identifier).toBe('item-1');
      expect(json.destinationNodeURI.identifier).toBe('item-2');
    });

    describe('node URIs pointing at a CFDocument (#44)', () => {
      const docId = '11111111-1111-4111-8111-111111111111';
      const itemId = '22222222-2222-4222-8222-222222222222';

      it('keeps a /CFDocuments/ destination when the source URI points at a CFDocument', () => {
        const raw = {
          identifier: '33333333-3333-4333-8333-333333333333',
          associationType: 'exactMatchOf',
          originNodeURI: { title: 'Mathematics', identifier: itemId, uri: `https://opencase.example.org/ims/case/v1p1/CFItems/${itemId}` },
          destinationNodeURI: { title: 'Primary Education – Mathematics', identifier: docId, uri: `https://opencase.example.org/ims/case/v1p1/CFDocuments/${docId}` }
        };

        const json = CFAssociation.fromRaw(tenantId, caseVersion, raw).toJSON();

        expect(json.originNodeURI.uri).toBe(`/ims/case/v1p1/CFItems/${itemId}`);
        expect(json.destinationNodeURI.uri).toBe(`/ims/case/v1p1/CFDocuments/${docId}`);
        expect(json.destinationNodeURI.identifier).toBe(docId);
      });

      it('recognises relative, foreign-host and other-version CFDocuments URIs', () => {
        for (const uri of [
          `/ims/case/v1p1/CFDocuments/${docId}`,
          `https://standards.example.org/ims/case/v1p0/CFDocuments/${docId}/`,
          `https://standards.example.org/ims/case/v1p1/CFDocuments/${docId}?x=1`
        ]) {
          const raw = {
            identifier: 'assoc-1',
            associationType: 'isChildOf',
            originNodeURI: { title: 'Item', identifier: itemId, uri: `/ims/case/v1p1/CFItems/${itemId}` },
            destinationNodeURI: { title: 'Doc', identifier: docId, uri }
          };
          expect(CFAssociation.fromRaw(tenantId, caseVersion, raw).toJSON().destinationNodeURI.uri)
            .toBe(`/ims/case/v1p1/CFDocuments/${docId}`);
        }
      });

      it('uses the CASE version of the package for the CFDocuments path', () => {
        const raw = {
          identifier: 'assoc-1',
          associationType: 'isChildOf',
          originNodeURI: { title: 'Item', identifier: itemId, uri: `/ims/case/v1p0/CFItems/${itemId}` },
          destinationNodeURI: { title: 'Doc', identifier: docId, uri: `/ims/case/v1p1/CFDocuments/${docId}` }
        };
        expect(CFAssociation.fromRaw(tenantId, '1.0', raw).toJSON().destinationNodeURI.uri)
          .toBe(`/ims/case/v1p0/CFDocuments/${docId}`);
      });

      it('treats a urn:case:document: URN as a CFDocument', () => {
        const raw = {
          identifier: 'assoc-1',
          associationType: 'isChildOf',
          originNodeURI: { title: 'Item', identifier: itemId, uri: `urn:case:item:${itemId}` },
          destinationNodeURI: { title: 'Doc', identifier: docId, uri: `urn:case:document:${docId}` }
        };
        const json = CFAssociation.fromRaw(tenantId, caseVersion, raw).toJSON();
        expect(json.originNodeURI.uri).toBe(`/ims/case/v1p1/CFItems/${itemId}`);
        expect(json.destinationNodeURI.uri).toBe(`/ims/case/v1p1/CFDocuments/${docId}`);
      });

      it('uses /CFDocuments/ for a known document identifier, even when the source URI says CFItems or is missing', () => {
        const raw = {
          identifier: 'assoc-1',
          associationType: 'isChildOf',
          originNodeURI: { title: 'Item', identifier: itemId, uri: `/ims/case/v1p1/CFItems/${itemId}` },
          destinationNodeURI: { title: 'Doc', identifier: docId, uri: `/ims/case/v1p1/CFItems/${docId}` }
        };
        expect(CFAssociation.fromRaw(tenantId, caseVersion, raw, { documentIdentifiers: [docId] }).toJSON().destinationNodeURI.uri)
          .toBe(`/ims/case/v1p1/CFDocuments/${docId}`);

        const legacy = { sourcedId: 'assoc-2', originNode: itemId, destinationNode: docId, associationType: 'isChildOf' };
        expect(CFAssociation.fromRaw(tenantId, caseVersion, legacy, { documentIdentifiers: [docId] }).toJSON().destinationNodeURI.uri)
          .toBe(`/ims/case/v1p1/CFDocuments/${docId}`);
      });

      it('does not treat a CFDocuments URI for a different identifier as a document', () => {
        const raw = {
          identifier: 'assoc-1',
          associationType: 'isChildOf',
          originNodeURI: { title: 'Item', identifier: itemId, uri: `/ims/case/v1p1/CFItems/${itemId}` },
          destinationNodeURI: { title: 'Other', identifier: 'item-2', uri: `/ims/case/v1p1/CFDocuments/${docId}` }
        };
        expect(CFAssociation.fromRaw(tenantId, caseVersion, raw).toJSON().destinationNodeURI.uri)
          .toBe('/ims/case/v1p1/CFItems/item-2');
      });

      it('is stable on reload: a stored /CFDocuments/ URI stays a /CFDocuments/ URI', () => {
        const raw = {
          identifier: 'assoc-1',
          associationType: 'isChildOf',
          originNodeURI: { title: 'Item', identifier: itemId, uri: `/ims/case/v1p1/CFItems/${itemId}` },
          destinationNodeURI: { title: 'Doc', identifier: docId, uri: `https://opencase.example.org/ims/case/v1p1/CFDocuments/${docId}` }
        };
        const first = CFAssociation.fromRaw(tenantId, caseVersion, raw).toJSON();
        const second = CFAssociation.fromRaw(tenantId, caseVersion, first).toJSON();
        expect(second.destinationNodeURI).toEqual(first.destinationNodeURI);
      });
    });

    describe('nodes outside CASE (targetType, #49)', () => {
      const itemId = '22222222-2222-4222-8222-222222222222';
      const external = {
        title: 'External goal 1.2.3',
        identifier: '44444444-4444-4444-8444-444444444444',
        uri: 'https://standards.example.org/goals/1.2.3',
        targetType: 'ext:external'
      };
      const raw = {
        identifier: '55555555-5555-4555-8555-555555555555',
        associationType: 'isRelatedTo',
        originNodeURI: { title: 'Item', identifier: itemId, uri: `/ims/case/v1p1/CFItems/${itemId}` },
        destinationNodeURI: external
      };

      it('keeps a non-CASE destination exactly as supplied', () => {
        const json = CFAssociation.fromRaw(tenantId, caseVersion, raw).toJSON();
        expect(json.destinationNodeURI).toEqual(external);
        expect(json.originNodeURI.uri).toBe(`/ims/case/v1p1/CFItems/${itemId}`);
      });

      it('round-trips unchanged (fromRaw → toJSON → fromRaw)', () => {
        const first = CFAssociation.fromRaw(tenantId, caseVersion, raw).toJSON();
        const second = CFAssociation.fromRaw(tenantId, caseVersion, first).toJSON();
        expect(second).toEqual(first);
      });

      it('keeps targetType CASE and still rebases the uri onto the local host', () => {
        const json = CFAssociation.fromRaw(tenantId, caseVersion, {
          ...raw,
          destinationNodeURI: { title: 'Item 2', identifier: 'item-2', uri: 'https://standards.example.org/ims/case/v1p1/CFItems/item-2', targetType: 'CASE' }
        }).toJSON();
        expect(json.destinationNodeURI).toEqual({
          title: 'Item 2', identifier: 'item-2', uri: '/ims/case/v1p1/CFItems/item-2', targetType: 'CASE'
        });
      });

      it('drops targetType when serialized as CASE 1.0', () => {
        const json = CFAssociation.fromRaw(tenantId, caseVersion, raw).toJSON('1.0');
        expect(json.destinationNodeURI.targetType).toBeUndefined();
        expect(json.destinationNodeURI.uri).toBe(external.uri);
      });

      it('does not lose targetType on the entity after a CASE 1.0 serialization', () => {
        const assoc = CFAssociation.fromRaw(tenantId, caseVersion, raw);
        assoc.toJSON('1.0');
        expect(assoc.toJSON().destinationNodeURI.targetType).toBe('ext:external');
      });
    });

    it('should rewrite CFAssociationGroupingURI to the local host on import', () => {
      const raw = {
        sourcedId: 'assoc-123',
        originNode: 'item-1',
        destinationNode: 'item-2',
        associationType: 'isChildOf',
        CFAssociationGroupingURI: {
          title: 'Grouping',
          identifier: 'c0c0c0c0-0000-4000-a000-000000000009',
          uri: 'https://standards.example.org/ims/case/v1p0/CFAssociationGroupings/c0c0c0c0-0000-4000-a000-000000000009'
        }
      };

      const assoc = CFAssociation.fromRaw(tenantId, caseVersion, raw);
      const json = assoc.toJSON();

      expect(json.CFAssociationGroupingURI.uri).toBe('/ims/case/v1p1/CFAssociationGroupings/c0c0c0c0-0000-4000-a000-000000000009');
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

