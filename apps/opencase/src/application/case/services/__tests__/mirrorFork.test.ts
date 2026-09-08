import { stripNonDataFields, mintForkedIdentifiers } from '../mirrorFork'

describe('stripNonDataFields', () => {
  it('strips ext:opencase and lastChangeDateTime at every entity level', () => {
    const bundle = {
      CFDocument: {
        identifier: 'doc-1',
        title: 'Doc',
        lastChangeDateTime: '2024-01-01T00:00:00Z',
        extensions: { 'ext:opencase': { isModifiedFromSource: false }, 'ext:other': { keep: true } }
      },
      CFItems: [{ identifier: 'item-1', fullStatement: 'S1', lastChangeDateTime: '2024-01-02T00:00:00Z' }],
      CFAssociations: [{ identifier: 'assoc-1', lastChangeDateTime: '2024-01-03T00:00:00Z' }],
      CFRubrics: [{ identifier: 'rubric-1', lastChangeDateTime: '2024-01-04T00:00:00Z' }]
    }

    const stripped = stripNonDataFields(bundle)

    expect(stripped.CFDocument.lastChangeDateTime).toBeUndefined()
    expect((stripped.CFDocument as any).extensions['ext:opencase']).toBeUndefined()
    expect((stripped.CFDocument as any).extensions['ext:other']).toEqual({ keep: true })
    expect(stripped.CFItems![0].lastChangeDateTime).toBeUndefined()
    expect(stripped.CFAssociations![0].lastChangeDateTime).toBeUndefined()
    expect(stripped.CFRubrics![0].lastChangeDateTime).toBeUndefined()
  })

  it('treats a position-only re-export and the original as data-identical', () => {
    const base = {
      CFDocument: { identifier: 'doc-1', title: 'Doc', lastChangeDateTime: '2024-01-01T00:00:00Z', extensions: {} },
      CFItems: [{ identifier: 'item-1', fullStatement: 'S1', lastChangeDateTime: '2024-01-01T00:00:00Z', extensions: {} }],
      CFAssociations: [],
      CFRubrics: []
    }
    const afterLayoutEdit = {
      CFDocument: { ...base.CFDocument, lastChangeDateTime: '2024-06-01T00:00:00Z' },
      CFItems: [{
        ...base.CFItems[0],
        lastChangeDateTime: '2024-06-01T00:00:00Z',
        extensions: { 'ext:opencase': { layout: { x: 500, y: 200 } } }
      }],
      CFAssociations: [],
      CFRubrics: []
    }

    expect(stripNonDataFields(base)).toEqual(stripNonDataFields(afterLayoutEdit))
  })

  it('ignores CFPackageURI/CFDocumentURI — GET-only back-references the frontend always re-synthesizes on export', () => {
    const base = {
      CFDocument: {
        identifier: 'doc-1',
        title: 'Doc',
        lastChangeDateTime: '2024-01-01T00:00:00Z',
        CFPackageURI: { identifier: 'doc-1', uri: 'https://source.example.org/ims/case/v1p1/CFPackages/doc-1', title: 'Doc' }
      },
      CFItems: [{
        identifier: 'item-1',
        fullStatement: 'S1',
        lastChangeDateTime: '2024-01-01T00:00:00Z',
        CFDocumentURI: { identifier: 'doc-1', uri: 'https://source.example.org/ims/case/v1p1/CFDocuments/doc-1', title: 'Doc' }
      }],
      CFAssociations: [],
      CFRubrics: []
    }
    // The frontend's exporter always fabricates a fresh, local placeholder
    // CFPackageURI/CFDocumentURI on every save — never the mirrored
    // document's real (possibly foreign) one — so these must never be
    // treated as a data difference on their own.
    const reExported = {
      CFDocument: { ...base.CFDocument, lastChangeDateTime: '2024-06-01T00:00:00Z', CFPackageURI: { identifier: 'doc-1', uri: 'urn:case:package:doc-1', title: 'Doc' } },
      CFItems: [{ ...base.CFItems[0], lastChangeDateTime: '2024-06-01T00:00:00Z', CFDocumentURI: { identifier: 'doc-1', uri: 'urn:case:document:doc-1', title: 'Doc' } }],
      CFAssociations: [],
      CFRubrics: []
    }

    expect(stripNonDataFields(base)).toEqual(stripNonDataFields(reExported))
  })

  it('ignores CFDefinitions entirely, even a genuine content difference in a referenced definition\'s rendering', () => {
    // A mirror's own persisted CFDefinitions preserves the source's raw blob
    // (foreign uri) forever, while the frontend always rebuilds CFDefinitions
    // fresh from the tenant's live shared catalog on every save. When a
    // referenced identifier collides with one of OpenCASE's own permanent
    // seed defaults (see FileFrameworkStore's seed-ownership protection),
    // the tenant catalog permanently reports the seed's local uri — which
    // will never again match the foreign uri the mirror originally recorded,
    // with nothing about the framework's own content having changed.
    const asImported = {
      CFDocument: { identifier: 'doc-1', title: 'Doc' },
      CFItems: [],
      CFAssociations: [],
      CFRubrics: [],
      CFDefinitions: {
        CFLicenses: [{ identifier: 'c0c0c0c0-...-0001', title: 'CC0', uri: 'https://source.example.org/ims/case/v1p1/CFLicenses/c0c0c0c0-...-0001' }]
      }
    }
    const asReSaved = {
      CFDocument: { identifier: 'doc-1', title: 'Doc' },
      CFItems: [],
      CFAssociations: [],
      CFRubrics: [],
      CFDefinitions: {
        CFLicenses: [{ identifier: 'c0c0c0c0-...-0001', title: 'CC0', uri: '/ims/case/v1p1/CFLicenses/c0c0c0c0-...-0001' }]
      }
    }

    expect(stripNonDataFields(asImported)).toEqual(stripNonDataFields(asReSaved))
  })

  it('surfaces a real statement edit as a difference', () => {
    const base = {
      CFDocument: { identifier: 'doc-1', title: 'Doc', lastChangeDateTime: '2024-01-01T00:00:00Z' },
      CFItems: [{ identifier: 'item-1', fullStatement: 'Original', lastChangeDateTime: '2024-01-01T00:00:00Z' }]
    }
    const edited = {
      CFDocument: { identifier: 'doc-1', title: 'Doc', lastChangeDateTime: '2024-06-01T00:00:00Z' },
      CFItems: [{ identifier: 'item-1', fullStatement: 'Edited', lastChangeDateTime: '2024-06-01T00:00:00Z' }]
    }

    expect(stripNonDataFields(base)).not.toEqual(stripNonDataFields(edited))
  })
})

describe('mintForkedIdentifiers', () => {
  const tenantId = 'test-tenant'
  const caseVersion = '1.1'

  const payload = () => ({
    CFDocument: {
      sourcedId: 'source-doc',
      identifier: 'source-doc',
      uri: 'https://source.example.org/ims/case/v1p1/CFDocuments/source-doc',
      title: 'Source Doc'
    },
    CFItems: [
      { sourcedId: 'source-item-1', identifier: 'source-item-1', uri: 'https://source.example.org/ims/case/v1p1/CFItems/source-item-1', fullStatement: 'S1' },
      { sourcedId: 'source-item-2', identifier: 'source-item-2', uri: 'https://source.example.org/ims/case/v1p1/CFItems/source-item-2', fullStatement: 'S2' }
    ],
    CFAssociations: [
      {
        sourcedId: 'source-assoc-1',
        identifier: 'source-assoc-1',
        associationType: 'isChildOf',
        originNodeURI: { title: 'Item 1', identifier: 'source-item-1', uri: 'https://source.example.org/ims/case/v1p1/CFItems/source-item-1' },
        destinationNodeURI: { title: 'Doc', identifier: 'source-doc', uri: 'https://source.example.org/ims/case/v1p1/CFDocuments/source-doc' }
      }
    ],
    CFRubrics: [{ identifier: 'source-rubric-1', uri: 'https://source.example.org/ims/case/v1p1/CFRubrics/source-rubric-1' }]
  })

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  it('mints fresh UUID identifiers and local URIs for every entity', () => {
    const minted = mintForkedIdentifiers(payload(), tenantId, caseVersion)

    expect(minted.CFDocument.identifier).toMatch(uuidRegex)
    expect(minted.CFDocument.identifier).not.toBe('source-doc')
    expect(minted.CFDocument.uri).toBe(`/ims/case/v1p1/CFDocuments/${minted.CFDocument.identifier}`)

    for (const item of minted.CFItems!) {
      expect(item.identifier).toMatch(uuidRegex)
      expect(item.uri).toBe(`/ims/case/v1p1/CFItems/${item.identifier}`)
      expect(item.CFDocumentURI).toEqual({ title: 'Source Doc', identifier: minted.CFDocument.identifier, uri: minted.CFDocument.uri })
    }

    const assoc = minted.CFAssociations![0]
    expect(assoc.identifier).toMatch(uuidRegex)
    expect(assoc.identifier).not.toBe('source-assoc-1')

    const rubric = minted.CFRubrics![0]
    expect(rubric.identifier).toMatch(uuidRegex)
    expect(rubric.uri).toBe(`/ims/case/v1p1/CFRubrics/${rubric.identifier}`)
  })

  it('remaps an association origin reference to the new item identifier', () => {
    const minted = mintForkedIdentifiers(payload(), tenantId, caseVersion)
    const newItem1Id = minted.CFItems![0].identifier

    const assoc = minted.CFAssociations![0]
    expect(assoc.originNodeURI.identifier).toBe(newItem1Id)
    expect(assoc.originNodeURI.uri).toBe(`/ims/case/v1p1/CFItems/${newItem1Id}`)
  })

  it('remaps an association reference to the document-as-node case', () => {
    const minted = mintForkedIdentifiers(payload(), tenantId, caseVersion)

    const assoc = minted.CFAssociations![0]
    expect(assoc.destinationNodeURI.identifier).toBe(minted.CFDocument.identifier)
    expect(assoc.destinationNodeURI.uri).toBe(minted.CFDocument.uri)
  })

  it('throws on a dangling association reference', () => {
    const p = payload()
    p.CFAssociations[0].originNodeURI.identifier = 'does-not-exist'

    expect(() => mintForkedIdentifiers(p, tenantId, caseVersion)).toThrow(/references unknown node/)
  })

  it('keeps a reference URI\'s identifier but rebases it onto this instance, since forking makes the framework fully independent of the source host', () => {
    const p: any = payload()
    p.CFDocument.licenseURI = { identifier: 'license-1', uri: 'https://source.example.org/ims/case/v1p1/CFLicenses/license-1', title: 'CC BY' }
    p.CFItems[0].CFItemTypeURI = { identifier: 'itemtype-1', uri: 'https://source.example.org/ims/case/v1p1/CFItemTypes/itemtype-1', title: 'Standard' }
    p.CFAssociations[0].CFAssociationGroupingURI = { identifier: 'grouping-1', uri: 'https://source.example.org/ims/case/v1p1/CFAssociationGroupings/grouping-1', title: 'Alignment' }

    const minted = mintForkedIdentifiers(p, tenantId, caseVersion)

    expect((minted.CFDocument as any).licenseURI).toEqual({ identifier: 'license-1', uri: '/ims/case/v1p1/CFLicenses/license-1', title: 'CC BY' })
    expect((minted.CFItems![0] as any).CFItemTypeURI).toEqual({ identifier: 'itemtype-1', uri: '/ims/case/v1p1/CFItemTypes/itemtype-1', title: 'Standard' })
    expect((minted.CFAssociations![0] as any).CFAssociationGroupingURI).toEqual({ identifier: 'grouping-1', uri: '/ims/case/v1p1/CFAssociationGroupings/grouping-1', title: 'Alignment' })
  })
})
