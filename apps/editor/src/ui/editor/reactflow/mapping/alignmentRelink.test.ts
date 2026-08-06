import { describe, it, expect } from 'vitest'
import { normalizeCasePackageResponse } from '@/application/framework/mappers/case/normalizeCasePackage'
import { mapCaseSnapshotToDomainFramework } from '@/application/framework/mappers/case/caseToDomainFramework'
import { toReactFlowGraph } from './toReactFlow'

const DOC = 'd0000000-0000-4000-a000-000000000001'
const ITEM = 'a0000000-0000-4000-a000-000000000002'
const REG_NODE_ID = 'ce-64e007f5-3a53-46a2-9abe-92c8717e62dd'
const REG_URL = `https://credentialengineregistry.org/resources/${REG_NODE_ID}`
const REG_DEST_IDENTIFIER = '64e007f5-3a53-46a2-9abe-92c8717e62dd' // CTID's UUID — deliberately != node id
const EXT_NODE_ID = 'ext_ccss'
const EXT_URL = 'https://example.org/frameworks/ccss'
const NOW = '2026-08-06T00:00:00Z'

// Simulate a CFPackage as served on reload: reference nodes live in the document
// extension, and alignment associations point at them by URI (their identifier does
// NOT match the reference node's canvas id). The editor must re-link the edges.
function served() {
  return {
    CFDocument: {
      identifier: DOC, uri: `/ims/case/v1p1/CFDocuments/${DOC}`, title: 'FW', caseVersion: '1.1', lastChangeDateTime: NOW,
      extensions: {
        'ext:opencase': {
          registryNodes: [{ id: REG_NODE_ID, ctdlUri: REG_URL, ctdlCtid: REG_NODE_ID, fullStatement: 'Reg competency' }],
          externalNodes: [{ id: EXT_NODE_ID, uri: EXT_URL, title: 'CCSS' }],
        },
      },
    },
    CFItems: [
      { identifier: ITEM, uri: `/ims/case/v1p1/CFItems/${ITEM}`, fullStatement: 'My item', CFItemType: 'Competency', lastChangeDateTime: NOW,
        CFDocumentURI: { identifier: DOC, uri: `/ims/case/v1p1/CFDocuments/${DOC}` } },
    ],
    CFAssociations: [
      { identifier: 'assoc-reg', uri: '/ims/case/v1p1/CFAssociations/assoc-reg', associationType: 'isRelatedTo',
        originNodeURI: { identifier: ITEM, uri: `/ims/case/v1p1/CFItems/${ITEM}` },
        destinationNodeURI: { identifier: REG_DEST_IDENTIFIER, uri: REG_URL, title: 'Reg competency' },
        lastChangeDateTime: NOW,
        extensions: { 'ext:opencase': { ctdlDestinationUri: REG_URL } } },
      { identifier: 'assoc-ext', uri: '/ims/case/v1p1/CFAssociations/assoc-ext', associationType: 'isRelatedTo',
        originNodeURI: { identifier: ITEM, uri: `/ims/case/v1p1/CFItems/${ITEM}` },
        destinationNodeURI: { identifier: 'whatever-hash', uri: EXT_URL, title: 'CCSS' },
        lastChangeDateTime: NOW,
        extensions: { 'ext:opencase': { externalDestinationUri: EXT_URL } } },
    ],
  }
}

describe('alignment edge re-link on reload', () => {
  const snap = normalizeCasePackageResponse(served())!
  const framework = mapCaseSnapshotToDomainFramework(snap)
  const { nodes, edges } = toReactFlowGraph({ framework })

  it('reconstructs both reference nodes', () => {
    expect(nodes.some((n) => n.id === REG_NODE_ID && n.type === 'registryItemNode')).toBe(true)
    expect(nodes.some((n) => n.id === EXT_NODE_ID && n.type === 'externalFrameworkNode')).toBe(true)
  })

  it('re-links the registry alignment edge to the reconstructed registry node', () => {
    expect(edges.some((e) => e.source === ITEM && e.target === REG_NODE_ID)).toBe(true)
  })

  it('re-links the external alignment edge to the reconstructed external node', () => {
    expect(edges.some((e) => e.source === ITEM && e.target === EXT_NODE_ID)).toBe(true)
  })

  it('leaves no alignment edge dangling to the raw destination identifier', () => {
    const nodeIds = new Set(nodes.map((n) => n.id))
    for (const e of edges) {
      expect(nodeIds.has(e.source)).toBe(true)
      expect(nodeIds.has(e.target)).toBe(true)
    }
  })
})
