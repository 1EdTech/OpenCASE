import { describe, it, expect } from 'vitest'
import { frameworkToCfPackage } from './toCasePackage'
import { loadFrameworkFromCfPackage } from '@/application/framework/services/FrameworkLoader'
import { toReactFlowGraph } from '@/ui/editor/reactflow/mapping/toReactFlow'
import { fromEditorGraph } from '@/ui/editor/reactflow/mapping/fromEditorGraph'
import { hasFrameworkDataChanged } from '@/domain/framework/hasFrameworkDataChanged'
import type { CFDocument, CFItem, CFPackage } from '@/domain/case/types'
import type { Framework, Item } from '@/domain/framework/model/types'
import type { ItemId } from '@/domain/shared/types'

const DOC_ID = 'doc-1'

// A package as created through the API by an external sync script (GitHub #42/#43):
// custom extensions sit alongside the editor's own ext:opencase on every entity.
function makePackage(): CFPackage {
  return {
    CFDocument: {
      identifier: DOC_ID,
      uri: `/ims/case/v1p1/CFDocuments/${DOC_ID}`,
      title: 'Curriculum',
      creator: 'Sync',
      lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      caseVersion: '1.1',
      extensions: {
        'ext:opencase': { publicAccess: true },
        sourceSystem: { name: 'smartschool', curriculumId: 'cur-9' },
      },
    },
    CFItems: [
      {
        identifier: 'item-1',
        uri: '/ims/case/v1p1/CFItems/item-1',
        fullStatement: 'Item 1',
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
        extensions: { 'ext:opencase': { colorBand: '#ff0000' }, smartschoolId: 'ss-1' },
      },
    ],
    CFAssociations: [
      {
        identifier: 'assoc-root',
        uri: '/ims/case/v1p1/CFAssociations/assoc-root',
        associationType: 'isChildOf',
        originNodeURI: { identifier: 'item-1', uri: '/ims/case/v1p1/CFItems/item-1', title: 'Item 1' },
        destinationNodeURI: { identifier: DOC_ID, uri: `/ims/case/v1p1/CFDocuments/${DOC_ID}`, title: 'Curriculum' },
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
        extensions: { 'ext:opencase': { originHandle: 'top' }, minimumGoal: 'MG-7' },
      },
    ],
  } as unknown as CFPackage
}

function loadIntoEditor() {
  const framework = loadFrameworkFromCfPackage(makePackage())
  if (!framework) throw new Error('failed to load framework')
  return toReactFlowGraph({ framework })
}

function saveFromEditor(graph: ReturnType<typeof toReactFlowGraph>) {
  const { framework, layout } = fromEditorGraph({ graph })
  return frameworkToCfPackage({ framework, caseVersion: '1.1', layout })
}

function withItemMetadata(framework: Framework, patch: Record<string, unknown>): Framework {
  const items = new Map(framework.items)
  const item = items.get('item-1' as ItemId) as Item
  items.set(item.id, { ...item, metadata: { ...item.metadata, ...patch } })
  return { ...framework, items }
}

describe('CASE extensions round-trip through the editor', () => {
  it('shows custom item and document extensions on the canvas, without ext:opencase on the document', () => {
    const graph = loadIntoEditor()
    const itemNode = graph.nodes.find((n) => (n.data as { cfItem?: CFItem }).cfItem?.identifier === 'item-1')
    const docNode = graph.nodes.find((n) => (n.data as { cfDocument?: CFDocument }).cfDocument?.identifier === DOC_ID)

    expect((itemNode?.data as { cfItem: CFItem }).cfItem.extensions).toMatchObject({ smartschoolId: 'ss-1' })
    expect((docNode?.data as { cfDocument: CFDocument }).cfDocument.extensions).toEqual({
      sourceSystem: { name: 'smartschool', curriculumId: 'cur-9' },
    })
  })

  it('preserves custom extensions on the document, items and associations when saving', () => {
    const saved = saveFromEditor(loadIntoEditor())

    expect(saved.CFDocument.extensions).toEqual({
      sourceSystem: { name: 'smartschool', curriculumId: 'cur-9' },
      'ext:opencase': expect.objectContaining({ publicAccess: true }),
    })

    const item = saved.CFItems?.find((i) => i.identifier === 'item-1')
    expect(item?.extensions).toMatchObject({ smartschoolId: 'ss-1', 'ext:opencase': { colorBand: '#ff0000' } })

    const assoc = saved.CFAssociations?.find((a) => a.identifier === 'assoc-root')
    expect(assoc?.extensions).toMatchObject({ minimumGoal: 'MG-7', 'ext:opencase': { originHandle: 'top' } })
  })

  it('keeps custom document extensions even when there is no ext:opencase data to write', () => {
    const framework = loadFrameworkFromCfPackage(makePackage())!
    const noOpencase = { ...framework, metadata: { ...framework.metadata, publicAccess: undefined } }
    const saved = frameworkToCfPackage({ framework: noOpencase, caseVersion: '1.1' })

    expect(saved.CFDocument.extensions).toEqual({ sourceSystem: { name: 'smartschool', curriculumId: 'cur-9' } })
  })

  it('regenerates item ext:opencase from editor state so a cleared colorBand does not come back', () => {
    const { framework } = fromEditorGraph({ graph: loadIntoEditor() })
    const cleared = withItemMetadata(framework, { colorBand: undefined })
    const saved = frameworkToCfPackage({ framework: cleared, caseVersion: '1.1' })

    expect(saved.CFItems?.[0].extensions).toEqual({ smartschoolId: 'ss-1' })
  })

  it('treats an edited custom extension as a data change, but not a change to ext:opencase', () => {
    const { framework } = fromEditorGraph({ graph: loadIntoEditor() })
    const original = framework.items.get('item-1' as ItemId)!.metadata!.extensions as Record<string, unknown>

    const layoutOnly = withItemMetadata(framework, { extensions: { ...original, 'ext:opencase': { colorBand: '#00ff00' } } })
    const customEdit = withItemMetadata(framework, { extensions: { ...original, smartschoolId: 'ss-2' } })

    expect(hasFrameworkDataChanged(framework, layoutOnly)).toBe(false)
    expect(hasFrameworkDataChanged(framework, customEdit)).toBe(true)
  })

  it('keeps the association storage setting through the editor', () => {
    const pkg = makePackage()
    pkg.CFDocument.extensions = { 'ext:opencase': { alignmentStorage: 'alignmentFramework' } }
    const framework = loadFrameworkFromCfPackage(pkg)
    if (!framework) throw new Error('failed to load framework')

    expect(framework.metadata.alignmentStorage).toBe('alignmentFramework')
    const saved = saveFromEditor(toReactFlowGraph({ framework }))
    expect(saved.CFDocument.extensions).toEqual({ 'ext:opencase': expect.objectContaining({ alignmentStorage: 'alignmentFramework' }) })
  })
})
