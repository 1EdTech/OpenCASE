import { describe, it, expect } from 'vitest'
import { fromEditorGraph } from './fromEditorGraph'
import { frameworkToCfPackage, toOpenCaseFormat } from '@/application/framework/mappers/case/toCasePackage'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'

const FW = 'f0000000-0000-4000-a000-000000000001'
const ITEM = 'a0000000-0000-4000-a000-000000000002'
const EXT_ID = 'ext_ccss'
const EXT_URI = 'https://example.org/frameworks/ccss-math'

// An item aligned to an external-framework reference node must export as a real
// CFAssociation whose destination is the external URI (previously dropped entirely).
function graph(): EditorGraph {
  return {
    nodes: [
      { id: FW, type: 'caseFrameworkNode', position: { x: 0, y: 0 }, data: { cfDocument: { identifier: FW, sourcedId: FW, title: 'My Framework', lastChangeDateTime: '2026-08-06T00:00:00Z' } } },
      { id: ITEM, type: 'caseItemNode', position: { x: 0, y: 200 }, data: { cfItem: { identifier: ITEM, sourcedId: ITEM, fullStatement: 'My item', lastChangeDateTime: '2026-08-06T00:00:00Z' } } },
      { id: EXT_ID, type: 'externalFrameworkNode', position: { x: 400, y: 200 }, style: { width: 280, height: 120 }, data: { title: 'CCSS Math', uri: EXT_URI, source: 'State Standards' } },
    ],
    edges: [
      { id: 'e1', source: ITEM, target: EXT_ID, data: { associationType: 'isRelatedTo' } },
    ],
  } as unknown as EditorGraph
}

describe('external-framework alignment export', () => {
  const { framework, externalNodes } = fromEditorGraph({ graph: graph() })
  const pkg = frameworkToCfPackage({ framework, caseVersion: '1.1', externalNodes })
  const official = toOpenCaseFormat(pkg)

  it('does not drop the alignment — an association to the external node is emitted', () => {
    // fromEditorGraph must keep the edge (regression: it used to be skipped)
    expect(framework.associations.size).toBe(1)
    const align = official.CFAssociations!.find((a) => a.destinationNodeURI.uri === EXT_URI)
    expect(align).toBeDefined()
    expect(align!.associationType).toBe('isRelatedTo')
    expect(align!.destinationNodeURI.title).toBe('CCSS Math')
    expect(align!.originNodeURI.uri).toBe(`/ims/case/v1p1/CFItems/${ITEM}`)
  })

  it('records the external destination URI in the association extension', () => {
    const align = official.CFAssociations!.find((a) => a.destinationNodeURI.uri === EXT_URI)!
    const ext = (align.extensions as any)?.['ext:opencase']
    expect(ext?.externalDestinationUri).toBe(EXT_URI)
  })

  it('persists the external reference node in the document extensions', () => {
    expect(externalNodes).toHaveLength(1)
    const docExt = (official.CFDocument as any).extensions?.['ext:opencase']
    expect(docExt.externalNodes).toHaveLength(1)
    expect(docExt.externalNodes[0]).toMatchObject({ id: EXT_ID, title: 'CCSS Math', uri: EXT_URI, source: 'State Standards' })
  })
})
