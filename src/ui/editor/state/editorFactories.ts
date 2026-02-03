import type { Edge } from '@xyflow/react'
import type { CFAssociation, CFDocument, CFItem, CFPackage } from '@/domain/case/types'
import type { CaseEditorNodeType, CaseFrameworkNodeType, CaseItemNodeType } from '@/ui/editor/reactflow/types'

export type EditorGraph = {
  nodes: CaseEditorNodeType[]
  edges: Edge[]
}

const DEFAULT_NODE_WIDTH = 360
const DEFAULT_NODE_HEIGHT = 220
const HEADER_SAFE_Y = 96

const nowIso = () => new Date().toISOString()

export const makeCfItem = (id: string, fullStatement: string, extras?: Partial<CFItem>): CFItem => ({
  identifier: id,
  uri: `urn:case:item:${id}`,
  fullStatement,
  lastChangeDateTime: nowIso(),
  ...extras,
})

export const makeCfDocument = (id: string, title: string, extras?: Partial<CFDocument>): CFDocument => ({
  identifier: id,
  uri: `urn:case:document:${id}`,
  creator: 'District Curriculum Team',
  title,
  lastChangeDateTime: nowIso(),
  CFPackageURI: { uri: `urn:case:package:${id}` },
  caseVersion: '1.1',
  ...extras,
})

const wrapperNodeClassName = 'bg-transparent border-0 p-0 shadow-none'

export function createEmptyFrameworkGraph(params: {
  id: string
  title: string
  frameworkType?: string
  adoptionStatus?: string
  description?: string
  creator?: string
}): EditorGraph {
  const cfDocument = makeCfDocument(params.id, params.title, {
    frameworkType: params.frameworkType,
    adoptionStatus: params.adoptionStatus,
    description: params.description,
    creator: params.creator,
  })

  const fwNode: CaseFrameworkNodeType = {
    id: params.id,
    type: 'caseFrameworkNode',
    position: { x: 0, y: HEADER_SAFE_Y },
    style: { width: 520, height: 210 },
    data: { cfDocument },
    className: wrapperNodeClassName,
  }

  return { nodes: [fwNode], edges: [] }
}

export function createSampleGraph(): EditorGraph {
  const fwId = 'fw1'

  const nodes: CaseEditorNodeType[] = [
    {
      id: fwId,
      type: 'caseFrameworkNode',
      // Start below the floating header so it is visible on first load.
      position: { x: 0, y: HEADER_SAFE_Y },
      style: { width: 520, height: 210 },
      data: {
        cfDocument: makeCfDocument('fw1', 'Grade 3–5 Mathematics (Draft)', {
          frameworkType: 'K-12',
          adoptionStatus: 'Draft',
          description: 'A draft set of math expectations focused on number and operations (grades 3–5).',
        }),
      },
      className: wrapperNodeClassName,
    },
    {
      id: 'n1',
      type: 'caseItemNode',
      // Leave enough room between nodes so edges are visible (node height ~220).
      position: { x: 0, y: HEADER_SAFE_Y + 210 + 140 },
      style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      data: {
        cfItem: makeCfItem('n1', 'Understand and use place value to round whole numbers to any place.', {
          humanCodingScheme: '3.NBT.A.1',
          CFItemType: 'Standard',
          subject: ['Mathematics'],
          educationLevel: ['Grade 3'],
          conceptKeywords: ['place value', 'rounding'],
          alternativeLabel: 'Rounding whole numbers (place value)',
        }),
        parentId: fwId,
      },
      className: wrapperNodeClassName,
    },
    {
      id: 'n2',
      type: 'caseItemNode',
      position: { x: 0, y: HEADER_SAFE_Y + 210 + 140 + 320 },
      style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      data: {
        cfItem: makeCfItem('n2', 'Explain patterns in the number of zeros of the product when multiplying by powers of 10.', {
          humanCodingScheme: '3.NBT.A.2',
          CFItemType: 'Standard',
          subject: ['Mathematics'],
          educationLevel: ['Grade 3'],
          conceptKeywords: ['powers of ten', 'patterns', 'multiplication'],
        }),
        parentId: 'n1',
      },
      className: wrapperNodeClassName,
    },
    {
      id: 'n3',
      type: 'caseItemNode',
      position: { x: 0, y: HEADER_SAFE_Y + 210 + 140 + 320 + 320 },
      style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      data: {
        cfItem: makeCfItem('n3', 'Use place value understanding to round decimals to a specified place.', {
          humanCodingScheme: '5.NBT.A.4',
          CFItemType: 'Standard',
          subject: ['Mathematics'],
          educationLevel: ['Grade 5'],
          conceptKeywords: ['decimals', 'rounding', 'place value'],
        }),
        parentId: 'n2',
      },
      className: wrapperNodeClassName,
    },
  ]

  const edges: Edge[] = [
    { id: 'fw1-n1', source: 'fw1', target: 'n1' },
    { id: 'n1-n2', source: 'n1', target: 'n2' },
    { id: 'n2-n3', source: 'n2', target: 'n3' },
  ]

  return { nodes, edges }
}

export function createGraphFromCfPackage(pkg: CFPackage): EditorGraph {
  const doc = pkg.CFDocument
  const wrapperNodeClassName = 'bg-transparent border-0 p-0 shadow-none'

  const fwNode: CaseFrameworkNodeType = {
    id: doc.identifier,
    type: 'caseFrameworkNode',
    position: { x: 0, y: HEADER_SAFE_Y },
    style: { width: 520, height: 210 },
    data: { cfDocument: doc },
    className: wrapperNodeClassName,
  }

  const nodes: CaseEditorNodeType[] = [fwNode]
  const edges: Edge[] = []

  const itemById = new Map<string, CFItem>((pkg.CFItems ?? []).map((it) => [it.identifier, it]))
  const parentByChild = new Map<string, string>()

  for (const a of pkg.CFAssociations ?? []) {
    // For hierarchical edges, treat destination as parent and origin as child for layout.
    const type = (a.associationType ?? '').toLowerCase()
    if (type !== 'ischildof' && type !== 'ispartof') continue
    const childId = a.originNodeURI?.identifier
    const parentId = a.destinationNodeURI?.identifier
    if (!childId || !parentId) continue
    parentByChild.set(childId, parentId)
  }

  const sortedItems = Array.from(itemById.values()).sort((a, b) => a.identifier.localeCompare(b.identifier))
  let y = HEADER_SAFE_Y + 210 + 140
  for (const it of sortedItems) {
    const parentId = parentByChild.get(it.identifier) ?? doc.identifier
    const node: CaseItemNodeType = {
      id: it.identifier,
      type: 'caseItemNode',
      position: { x: 0, y },
      style: { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
      data: { cfItem: it, parentId },
      className: wrapperNodeClassName,
    }
    nodes.push(node)
    y += DEFAULT_NODE_HEIGHT + 100
  }

  // Build edges used by layout (source=parent, target=child).
  for (const it of sortedItems) {
    const parentId = parentByChild.get(it.identifier) ?? doc.identifier
    const edgeId = `e_${parentId}_${it.identifier}`
    edges.push({ id: edgeId, source: parentId, target: it.identifier })
  }

  // Optionally include non-hierarchical associations as edges (kept separate from parentId wiring).
  for (const a of pkg.CFAssociations ?? []) {
    const type = (a.associationType ?? '').toLowerCase()
    if (type === 'ischildof' || type === 'ispartof') continue
    const fromId = a.originNodeURI?.identifier
    const toId = a.destinationNodeURI?.identifier
    if (!fromId || !toId) continue
    if (!itemById.has(fromId) || !itemById.has(toId)) continue
    const edgeId = a.identifier || `a_${fromId}_${toId}`
    edges.push({ id: edgeId, source: fromId, target: toId })
  }

  return { nodes, edges }
}

