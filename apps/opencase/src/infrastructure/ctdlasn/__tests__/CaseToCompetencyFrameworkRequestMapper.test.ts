import { mapCaseToCompetencyFrameworkRequest } from '../CaseToCompetencyFrameworkRequestMapper'
import { generateCtid, isCtid } from '../ctid'

describe('generateCtid', () => {
  it('produces a well-formed, unique ce-<uuid>', () => {
    const a = generateCtid()
    const b = generateCtid()
    expect(isCtid(a)).toBe(true)
    expect(a).toMatch(/^ce-[0-9a-f-]{36}$/)
    expect(a).not.toBe(b)
  })
})

describe('mapCaseToCompetencyFrameworkRequest', () => {
  const pkg = {
    CFDocument: {
      identifier: 'doc-1', title: 'FW', description: 'A framework', language: 'en-US',
      publisher: 'Acme', officialSourceURL: 'https://src.example/fw',
    },
    CFItems: [
      { identifier: 'item-parent', fullStatement: 'Parent', humanCodingScheme: '1' },
      { identifier: 'item-child', fullStatement: 'Child', humanCodingScheme: '1.1', alternativeLabel: 'Child label', notes: 'a note' },
    ],
    CFAssociations: [
      { associationType: 'isChildOf', originNodeURI: { identifier: 'item-child' }, destinationNodeURI: { identifier: 'item-parent' } },
      { associationType: 'isChildOf', originNodeURI: { identifier: 'item-parent' }, destinationNodeURI: { identifier: 'doc-1', uri: '/ims/case/v1p1/CFDocuments/doc-1' } },
      { associationType: 'exactMatchOf', originNodeURI: { identifier: 'item-child' }, destinationNodeURI: { identifier: 'x', uri: 'https://reg.example/resources/ce-abc' } },
      { associationType: 'isRelatedTo', originNodeURI: { identifier: 'item-child' }, destinationNodeURI: { identifier: 'y', uri: 'https://ext.example/ccss' } },
    ],
  }

  const req = mapCaseToCompetencyFrameworkRequest(pkg, { organizationCtid: 'ce-org', ctidFor: (id) => `ce-${id}` })

  it('sets base request + framework fields', () => {
    expect(req.PublishForOrganizationIdentifier).toBe('ce-org')
    expect(req.DefaultLanguage).toBe('en-US')
    expect(req.CompetencyFramework).toMatchObject({
      CTID: 'ce-doc-1', Name: 'FW', Description: 'A framework',
      InLanguage: ['en-US'], Publisher: ['ce-org'], PublisherName: ['Acme'], Source: ['https://src.example/fw'],
    })
  })

  it('lists only genuine top-level competencies in HasTopChild', () => {
    expect(req.CompetencyFramework.HasTopChild).toEqual(['ce-item-parent'])
  })

  it('maps competencies with structure and cross-framework alignments', () => {
    const child = req.Competencies.find((c) => c.CTID === 'ce-item-child')!
    expect(child.CompetencyText).toBe('Child')
    expect(child.CodedNotation).toBe('1.1')
    expect(child.CompetencyLabel).toBe('Child label')
    expect(child.Comment).toEqual(['a note'])
    expect(child.IsChildOf).toEqual(['ce-item-parent'])
    expect(child.ExactAlignment).toEqual(['https://reg.example/resources/ce-abc']) // exactMatchOf
    expect(child.AlignTo).toEqual(['https://ext.example/ccss'])                     // isRelatedTo

    const parent = req.Competencies.find((c) => c.CTID === 'ce-item-parent')!
    expect(parent.IsChildOf).toBeUndefined()
  })

  it('declares every competency as part of the framework (IsPartOf), and top-level ones as IsTopChildOf', () => {
    const child = req.Competencies.find((c) => c.CTID === 'ce-item-child')!
    const parent = req.Competencies.find((c) => c.CTID === 'ce-item-parent')!
    // All competencies belong to the framework
    expect(child.IsPartOf).toBe('ce-doc-1')
    expect(parent.IsPartOf).toBe('ce-doc-1')
    // Only the top-level competency is a top child of the framework
    expect(parent.IsTopChildOf).toBe('ce-doc-1')
    expect(child.IsTopChildOf).toBeUndefined()
  })
})

describe('cross-framework association mapping', () => {
  const REG = 'https://credentialengineregistry.org/resources/'
  const unmapped: Array<{ origin: string; associationType: string; destination: string }> = []
  const pkg = {
    CFDocument: { identifier: 'doc-1', title: 'FW' },
    CFItems: [{ identifier: 'i1', fullStatement: 'one' }, { identifier: 'i2', fullStatement: 'two' }],
    CFAssociations: [
      { associationType: 'isChildOf', originNodeURI: { identifier: 'i1' }, destinationNodeURI: { identifier: 'doc-1' } },
      { associationType: 'isChildOf', originNodeURI: { identifier: 'i2' }, destinationNodeURI: { identifier: 'doc-1' } },
      { associationType: 'isChildOf', originNodeURI: { identifier: 'i1' }, destinationNodeURI: { identifier: 'x', uri: REG + 'ce-ext1' } },
      { associationType: 'isPartOf', originNodeURI: { identifier: 'i1' }, destinationNodeURI: { identifier: 'y', uri: REG + 'ce-ext2' } },
      { associationType: 'isPeerOf', originNodeURI: { identifier: 'i2' }, destinationNodeURI: { identifier: 'z', uri: REG + 'ce-ext3' } },
      { associationType: 'precedes', originNodeURI: { identifier: 'i2' }, destinationNodeURI: { identifier: 'w', uri: REG + 'ce-ext4' } },
    ],
  }
  const req = mapCaseToCompetencyFrameworkRequest(pkg, { organizationCtid: 'ce-org', ctidFor: (id) => `ce-${id}`, unmapped })

  it('maps external isChildOf/isPartOf to NarrowAlignment (not in-framework hierarchy)', () => {
    const i1 = req.Competencies.find((c) => c.CTID === 'ce-i1')!
    expect(i1.NarrowAlignment).toEqual([REG + 'ce-ext1', REG + 'ce-ext2'])
    expect(i1.IsChildOf).toBeUndefined()
  })

  it('maps isPeerOf to AlignTo', () => {
    const i2 = req.Competencies.find((c) => c.CTID === 'ce-i2')!
    expect(i2.AlignTo).toEqual([REG + 'ce-ext3'])
  })

  it('reports precedes as unmapped instead of dropping it silently', () => {
    expect(unmapped).toEqual([{ origin: 'ce-i2', associationType: 'precedes', destination: REG + 'ce-ext4' }])
    const i2 = req.Competencies.find((c) => c.CTID === 'ce-i2')!
    expect(JSON.stringify(i2)).not.toContain('ce-ext4') // target not smuggled into any field
  })

  it('still treats framework-level isChildOf as top-level structure', () => {
    expect(req.CompetencyFramework.HasTopChild).toEqual(['ce-i1', 'ce-i2'])
    expect(req.Competencies.every((c) => c.IsTopChildOf === 'ce-doc-1')).toBe(true)
  })
})

describe('CASE URI preservation (ceasn:source / ceasn:identifier)', () => {
  const forked = {
    CFDocument: {
      identifier: 'doc-1', title: 'FW', language: 'en-US',
      uri: '/ims/case/v1p1/CFDocuments/doc-1',
      extensions: { 'ext:opencase': { derivedFrom: { uri: 'https://sandbox.credentialengineregistry.org/resources/ce-up', format: 'ctdl-asn' } } },
    },
    CFItems: [{ identifier: 'item-1', fullStatement: 'X', uri: '/ims/case/v1p1/CFItems/item-1' }],
    CFAssociations: [],
  }

  it('absolutizes relative CASE URIs against casePublicBaseUrl and preserves them as Identifier', () => {
    const r = mapCaseToCompetencyFrameworkRequest(forked, {
      organizationCtid: 'ce-org', ctidFor: (id) => `ce-${id}`, casePublicBaseUrl: 'https://case.example.org/',
    })
    expect(r.CompetencyFramework.Identifier).toEqual(['https://case.example.org/ims/case/v1p1/CFDocuments/doc-1'])
    expect(r.Competencies[0].Identifier).toEqual(['https://case.example.org/ims/case/v1p1/CFItems/item-1'])
    // The upstream registry original (derivedFrom) is preserved as ceasn:source.
    expect(r.CompetencyFramework.Source).toContain('https://sandbox.credentialengineregistry.org/resources/ce-up')
  })

  it('omits Identifier when no base URL is set and CASE URIs are relative, but keeps the absolute derivedFrom as Source', () => {
    const r = mapCaseToCompetencyFrameworkRequest(forked, { organizationCtid: 'ce-org', ctidFor: (id) => `ce-${id}` })
    expect(r.CompetencyFramework.Identifier).toBeUndefined()
    expect(r.Competencies[0].Identifier).toBeUndefined()
    expect(r.CompetencyFramework.Source).toEqual(['https://sandbox.credentialengineregistry.org/resources/ce-up'])
  })

  it('keeps already-absolute resolvable URIs and drops non-resolvable (localhost) ones', () => {
    const pkg = {
      CFDocument: { identifier: 'd', title: 'F', uri: 'http://localhost:3000/ims/case/v1p1/CFDocuments/d' },
      CFItems: [{ identifier: 'i', fullStatement: 'x', uri: 'https://case.example.org/ims/case/v1p1/CFItems/i' }],
      CFAssociations: [],
    }
    const r = mapCaseToCompetencyFrameworkRequest(pkg, { organizationCtid: 'ce-org', ctidFor: (id) => `ce-${id}` })
    expect(r.CompetencyFramework.Identifier).toBeUndefined() // localhost → dropped
    expect(r.Competencies[0].Identifier).toEqual(['https://case.example.org/ims/case/v1p1/CFItems/i'])
  })
})
