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
