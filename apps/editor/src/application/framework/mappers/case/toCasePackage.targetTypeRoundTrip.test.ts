import { describe, it, expect } from 'vitest'
import { frameworkToCfPackage, toOpenCaseFormat } from './toCasePackage'
import { loadFrameworkFromCfPackage } from '@/application/framework/services/FrameworkLoader'
import { toReactFlowGraph } from '@/ui/editor/reactflow/mapping/toReactFlow'
import { fromEditorGraph } from '@/ui/editor/reactflow/mapping/fromEditorGraph'
import { withOffCanvasAssociations } from '@/domain/framework/offCanvasAssociations'
import type { CFPackage } from '@/domain/case/types'

const DOC_ID = '11111111-1111-4111-8111-111111111111'
const ITEM_ID = '22222222-2222-4222-8222-222222222222'

// CASE 1.1 §1.9.3: an association pointing outside CASE (GitHub #49).
const EXTERNAL_DEST = {
  title: 'KO 3.1.2 De kleuters kunnen:',
  identifier: 'KO|3.1.2',
  uri: 'https://goals.example.org/goals/KO_V2_0?subject=Science#3.1.2',
  targetType: 'ext:curriculumGoals',
}

// A CASE item in another framework, explicitly marked targetType CASE.
const CASE_DEST = {
  title: 'Item in another framework',
  identifier: '33333333-3333-4333-8333-333333333333',
  uri: 'https://case.example.org/ims/case/v1p1/CFItems/33333333-3333-4333-8333-333333333333',
  targetType: 'CASE',
}

function makePackage(): CFPackage {
  return {
    CFDocument: {
      identifier: DOC_ID,
      uri: `/ims/case/v1p1/CFDocuments/${DOC_ID}`,
      title: 'Curriculum',
      creator: 'Sync',
      lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      caseVersion: '1.1',
    },
    CFItems: [
      {
        identifier: ITEM_ID,
        uri: `/ims/case/v1p1/CFItems/${ITEM_ID}`,
        fullStatement: 'Item 1',
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      },
    ],
    CFAssociations: [
      {
        identifier: '44444444-4444-4444-8444-444444444444',
        uri: '/ims/case/v1p1/CFAssociations/44444444-4444-4444-8444-444444444444',
        associationType: 'isChildOf',
        originNodeURI: { identifier: ITEM_ID, uri: `/ims/case/v1p1/CFItems/${ITEM_ID}`, title: 'Item 1' },
        destinationNodeURI: { identifier: DOC_ID, uri: `/ims/case/v1p1/CFDocuments/${DOC_ID}`, title: 'Curriculum' },
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      },
      {
        identifier: '55555555-5555-4555-8555-555555555555',
        uri: '/ims/case/v1p1/CFAssociations/55555555-5555-4555-8555-555555555555',
        associationType: 'exactMatchOf',
        originNodeURI: { identifier: ITEM_ID, uri: `/ims/case/v1p1/CFItems/${ITEM_ID}`, title: 'Item 1' },
        destinationNodeURI: EXTERNAL_DEST,
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      },
      {
        identifier: '66666666-6666-4666-8666-666666666666',
        uri: '/ims/case/v1p1/CFAssociations/66666666-6666-4666-8666-666666666666',
        associationType: 'isRelatedTo',
        originNodeURI: { identifier: ITEM_ID, uri: `/ims/case/v1p1/CFItems/${ITEM_ID}`, title: 'Item 1' },
        destinationNodeURI: CASE_DEST,
        lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      },
    ],
  } as unknown as CFPackage
}

function load(pkg: CFPackage = makePackage()) {
  const framework = loadFrameworkFromCfPackage(pkg)
  if (!framework) throw new Error('failed to load framework')
  return framework
}

/** Load → canvas graph → save, the same path EditorCanvas.handleSave takes. */
function saveFromEditor(pkg?: CFPackage) {
  const loaded = load(pkg)
  const framework = withOffCanvasAssociations(loaded, fromEditorGraph({ graph: toReactFlowGraph({ framework: loaded }) }).framework)
  return { framework, openCase: toOpenCaseFormat(frameworkToCfPackage({ framework, caseVersion: '1.1' })) }
}

const assocById = (pkg: ReturnType<typeof toOpenCaseFormat>, id: string) =>
  pkg.CFAssociations?.find((a) => a.identifier === id)

describe('association node targetType round-trip (#49)', () => {
  it('keeps a non-CASE destination verbatim: identifier, uri, title and targetType', () => {
    const { openCase } = saveFromEditor()
    expect(assocById(openCase, '55555555-5555-4555-8555-555555555555')?.destinationNodeURI).toEqual(EXTERNAL_DEST)
  })

  it('keeps targetType CASE and the supplied title on a node outside this framework', () => {
    const { openCase } = saveFromEditor()
    expect(assocById(openCase, '66666666-6666-4666-8666-666666666666')?.destinationNodeURI).toEqual(CASE_DEST)
  })

  it("keeps the source's title on a node in this framework rather than rebuilding it from the item", () => {
    const pkg = makePackage()
    const assoc = pkg.CFAssociations![2]
    assoc.originNodeURI = { ...assoc.originNodeURI, title: 'SCI.1 Item 1' }
    const { openCase } = saveFromEditor(pkg)
    expect(assocById(openCase, '66666666-6666-4666-8666-666666666666')?.originNodeURI.title).toBe('SCI.1 Item 1')
  })

  it('does not add a targetType to nodes that had none', () => {
    const { openCase } = saveFromEditor()
    const assoc = assocById(openCase, '44444444-4444-4444-8444-444444444444')
    expect(assoc?.originNodeURI).not.toHaveProperty('targetType')
    expect(assoc?.destinationNodeURI).not.toHaveProperty('targetType')
  })

  it('is stable across save → reload → save', () => {
    const { openCase: first } = saveFromEditor()
    const { openCase: second } = saveFromEditor(first as unknown as CFPackage)
    expect(second.CFAssociations).toEqual(first.CFAssociations)
  })
})
