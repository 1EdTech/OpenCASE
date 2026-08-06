import { describe, it, expect } from 'vitest'
import { toOpenCaseFormat } from './toCasePackage'
import type { CFPackage } from '@/domain/case/types'

const DOC_ID = 'a03f4ef2-eed6-4b33-b11a-83d665b72740'
const ITEM_A = '1496da12-1a12-45ee-982e-00005a5e8240'
const ITEM_B = '2496da12-1a12-45ee-982e-00005a5e8241'
const CTID = 'ce-64e007f5-3a53-46a2-9abe-92c8717e62dd'
const REGISTRY_URL = `https://credentialengineregistry.org/resources/${CTID}`
const NOW = '2026-08-06T14:42:54.537Z'

// Internal CFPackage shaped like associationToCfAssociation output, for the three
// destination kinds. toOpenCaseFormat is the authoritative "official CASE v1p1" export.
function buildPackage(): CFPackage {
  return {
    CFDocument: {
      sourcedId: DOC_ID, identifier: DOC_ID, uri: `urn:case:document:${DOC_ID}`,
      title: 'Test Framework', creator: 'C', lastChangeDateTime: NOW,
    },
    CFItems: [
      { sourcedId: ITEM_A, identifier: ITEM_A, uri: `urn:case:item:${ITEM_A}`, fullStatement: 'Item A', lastChangeDateTime: NOW },
      { sourcedId: ITEM_B, identifier: ITEM_B, uri: `urn:case:item:${ITEM_B}`, fullStatement: 'Item B', lastChangeDateTime: NOW },
    ],
    CFAssociations: [
      { // framework membership: top-level item isChildOf the document (placeholder LinkURI on input)
        sourcedId: 'assoc-root', identifier: 'assoc-root', associationType: 'isChildOf',
        originNodeURI: { identifier: ITEM_A, title: 'Item A', uri: `urn:case:item:${ITEM_A}` },
        destinationNodeURI: { identifier: DOC_ID, title: `Item ${DOC_ID}`, uri: `urn:case:item:${DOC_ID}` },
        lastChangeDateTime: NOW,
      },
      { // registry alignment: destination is a CTDL resource
        sourcedId: 'assoc-reg', identifier: 'assoc-reg', associationType: 'isRelatedTo',
        originNodeURI: { identifier: ITEM_A, title: 'Item A', uri: `urn:case:item:${ITEM_A}` },
        destinationNodeURI: { identifier: CTID, title: 'The ability to demonstrate ethical…', uri: REGISTRY_URL },
        lastChangeDateTime: NOW,
        extensions: { 'ext:opencase': { ctdlDestinationUri: REGISTRY_URL } },
      },
      { // ordinary item-to-item
        sourcedId: 'assoc-item', identifier: 'assoc-item', associationType: 'isRelatedTo',
        originNodeURI: { identifier: ITEM_A, title: 'Item A', uri: `urn:case:item:${ITEM_A}` },
        destinationNodeURI: { identifier: ITEM_B, title: 'Item B', uri: `urn:case:item:${ITEM_B}` },
        lastChangeDateTime: NOW,
      },
    ],
  } as unknown as CFPackage
}

describe('toOpenCaseFormat — association destination URIs', () => {
  const out = toOpenCaseFormat(buildPackage())
  const [root, reg, itemToItem] = out.CFAssociations!

  it('top-level membership points at the CFDocument (not a /CFItems/ URI)', () => {
    expect(root.associationType).toBe('isChildOf')
    expect(root.destinationNodeURI.uri).toBe(`/ims/case/v1p1/CFDocuments/${DOC_ID}`)
    expect(root.destinationNodeURI.identifier).toBe(DOC_ID)
    expect(root.destinationNodeURI.title).toBe('Test Framework') // not "Item a03f4ef2…"
  })

  it('registry alignment keeps the resource URL and uses the CTID’s UUID as identifier', () => {
    expect(reg.destinationNodeURI.uri).toBe(REGISTRY_URL)
    expect(reg.destinationNodeURI.identifier).toBe('64e007f5-3a53-46a2-9abe-92c8717e62dd') // ce- stripped, no hash
    expect(reg.destinationNodeURI.title).toBe('The ability to demonstrate ethical…')
  })

  it('ordinary item-to-item still resolves to a /CFItems/ URI', () => {
    expect(itemToItem.destinationNodeURI.uri).toBe(`/ims/case/v1p1/CFItems/${ITEM_B}`)
    expect(itemToItem.destinationNodeURI.identifier).toBe(ITEM_B)
  })
})
