import type { CFDocument, CFItem } from '@/domain/case/types'
import type { CaseEditorEdge, CaseEditorNodeType, CaseFrameworkNodeType } from '@/ui/editor/state/graphTypes'

export type EditorGraph = {
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
}

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
    data: { cfDocument },
  }

  return { nodes: [fwNode], edges: [] }
}

/** The graph the editor shows when it is opened without a framework (tests and previews). */
export function createSampleGraph(): EditorGraph {
  const fwId = 'fw1'

  const nodes: CaseEditorNodeType[] = [
    {
      id: fwId,
      type: 'caseFrameworkNode',
      data: {
        cfDocument: makeCfDocument('fw1', 'Grade 3–5 Mathematics (Draft)', {
          frameworkType: 'K-12',
          adoptionStatus: 'Draft',
          description: 'A draft set of math expectations focused on number and operations (grades 3–5).',
        }),
      },
    },
    {
      id: 'n1',
      type: 'caseItemNode',
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
    },
    {
      id: 'n2',
      type: 'caseItemNode',
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
    },
    {
      id: 'n3',
      type: 'caseItemNode',
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
    },
  ]

  // Hierarchical edges run parent (source) to child (target).
  const edges: CaseEditorEdge[] = [
    { id: `e_${fwId}_n1`, source: fwId, target: 'n1', data: { isHierarchical: true, associationType: '__startsFrom', isFrameworkRootConnection: true } },
    { id: 'e_n1_n2', source: 'n1', target: 'n2', data: { isHierarchical: true, associationType: 'isChildOf' } },
    { id: 'e_n2_n3', source: 'n2', target: 'n3', data: { isHierarchical: true, associationType: 'isChildOf' } },
  ]

  return { nodes, edges }
}
