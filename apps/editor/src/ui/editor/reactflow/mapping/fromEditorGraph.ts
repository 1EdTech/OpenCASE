import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import type { Framework, FrameworkMetadata, Item, Association, AssociationType, ItemType } from '@/domain/framework/model/types'
import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'
import type { LayoutState } from './types'
import type { CFDocument, CFItem } from '@/domain/case/types'

const isFrameworkNode = (n: EditorGraph['nodes'][number]) => n.type === 'caseFrameworkNode'
const isItemNode = (n: EditorGraph['nodes'][number]) => n.type === 'caseItemNode'

function mapItemType(rawType?: string): ItemType {
  const raw = (rawType ?? '').toLowerCase()
  if (raw.includes('skill')) return 'Skill'
  if (raw.includes('learning') || raw.includes('outcome')) return 'LearningOutcome'
  if (raw.includes('standard')) return 'Standard'
  if (raw.includes('compet')) return 'Competency'
  return 'Competency'
}

function edgeToAssociationType(edgeId: string, edgeData?: { associationType?: string; cfAssociation?: { associationType?: string } }): AssociationType {
  // Use the stored association type if available (check both top-level and cfAssociation)
  if (edgeData?.associationType) {
    return edgeData.associationType as AssociationType
  }
  if (edgeData?.cfAssociation?.associationType) {
    return edgeData.cfAssociation.associationType as AssociationType
  }
  // Legacy graphs used `e_${parent}_${child}` for hierarchy edges.
  if (edgeId.startsWith('e_')) return 'isChildOf'
  return 'isRelatedTo'
}

function readCfDocument(node: EditorGraph['nodes'][number]): CFDocument | null {
  const any = node.data as unknown as { cfDocument?: CFDocument }
  return any?.cfDocument ?? null
}

function readCfItem(node: EditorGraph['nodes'][number]): CFItem | null {
  const any = node.data as unknown as { cfItem?: CFItem }
  return any?.cfItem ?? null
}

export function fromEditorGraph(params: { graph: EditorGraph }): { framework: Framework; layout: LayoutState } {
  const { graph } = params
  const fwNode = graph.nodes.find(isFrameworkNode)
  const fwId = (fwNode?.id ?? 'fw') as unknown as FrameworkId
  const doc = fwNode ? readCfDocument(fwNode) : null

  const metadata: FrameworkMetadata = {
    title: doc?.title,
    description: doc?.description,
    creator: doc?.creator,
    frameworkType: doc?.frameworkType,
    adoptionStatus: doc?.adoptionStatus,
    caseVersion: doc?.caseVersion,
    version: doc?.version,
    lastChangeDateTime: doc?.lastChangeDateTime,
    licenseURI: doc?.licenseURI,
  }

  const items: Framework['items'] = new Map()
  for (const n of graph.nodes.filter(isItemNode)) {
    const cf = readCfItem(n)
    const item: Item = {
      id: n.id as unknown as ItemId,
      statement: cf?.fullStatement ?? '',
      type: mapItemType(cf?.CFItemType),
      metadata: {
        abbreviatedStatement: cf?.abbreviatedStatement,
        alternativeLabel: cf?.alternativeLabel,
        humanCodingScheme: cf?.humanCodingScheme,
        CFItemType: cf?.CFItemType,
        subject: cf?.subject,
        educationLevel: cf?.educationLevel,
        conceptKeywords: cf?.conceptKeywords,
        notes: cf?.notes,
        colorBand: cf?.colorBand,
        lastChangeDateTime: cf?.lastChangeDateTime,
        caseUri: cf?.uri,
        extensions: cf?.extensions,
      },
    }
    items.set(item.id, item)
  }

  const associations: Framework['associations'] = new Map()
  const fwNodeId = fwNode?.id ?? (fwId as unknown as string)

  for (const e of graph.edges) {
    const source = e.source
    const target = e.target

    const edgeData = e.data as {
      associationType?: string
      sequenceNumber?: number
      cfAssociation?: { identifier?: string; sequenceNumber?: number; associationType?: string; extensions?: Record<string, unknown> }
    } | undefined

    // Framework→item edges represent top-level isChildOf associations (item isChildOf document).
    // These must be preserved so sequence numbers and handle positions survive save/reload.
    if (source === fwNodeId) {
      if (!items.has(target as unknown as ItemId)) continue

      // Recover original association ID from cfAssociation, or generate a stable one
      const originalId = edgeData?.cfAssociation?.identifier ?? `isChildOf_${target}_${fwNodeId}`

      // Handle mapping: visual source=framework(parent/destination), visual target=item(child/origin)
      const originHandle = e.targetHandle ?? undefined      // item's handle
      const destinationHandle = e.sourceHandle ?? undefined  // framework's handle

      const assoc: Association = {
        id: originalId as unknown as AssociationId,
        fromItemId: target as unknown as ItemId,   // child (origin)
        toItemId: fwNodeId as unknown as ItemId,   // document (destination)
        associationType: 'isChildOf',
        metadata: {
          sequenceNumber: edgeData?.sequenceNumber ?? edgeData?.cfAssociation?.sequenceNumber,
          originHandle,
          destinationHandle,
          extensions: edgeData?.cfAssociation?.extensions,
        },
      }
      associations.set(assoc.id, assoc)
      continue
    }

    if (!items.has(source as unknown as ItemId)) continue
    if (!items.has(target as unknown as ItemId)) continue

    const associationType = edgeToAssociationType(e.id, edgeData)
    
    // For hierarchical types (isChildOf, isPartOf), the edge goes from child to parent visually
    // but the association semantically means "child isChildOf parent"
    const isHierarchical = associationType === 'isChildOf' || associationType === 'isPartOf'
    
    // Map visual edge handles to semantic origin/destination handles.
    // Hierarchical: visual source=parent=destination, visual target=child=origin
    // Non-hierarchical: visual source=origin, visual target=destination
    const originHandle = (isHierarchical ? e.targetHandle : e.sourceHandle) ?? undefined
    const destinationHandle = (isHierarchical ? e.sourceHandle : e.targetHandle) ?? undefined
    
    const assoc: Association = {
      id: e.id as unknown as AssociationId,
      fromItemId: (isHierarchical ? target : source) as unknown as ItemId,
      toItemId: (isHierarchical ? source : target) as unknown as ItemId,
      associationType,
      metadata: {
        sequenceNumber: edgeData?.cfAssociation?.sequenceNumber,
        originHandle,
        destinationHandle,
        extensions: edgeData?.cfAssociation?.extensions,
      },
    }
    associations.set(assoc.id, assoc)
  }

  const framework: Framework = {
    id: fwId,
    metadata,
    items,
    associations,
    status: 'Draft',
  }

  const byNodeId: LayoutState['byNodeId'] = {}
  for (const n of graph.nodes) {
    const styleAny = n.style as unknown as { width?: number; height?: number } | undefined
    byNodeId[n.id] = {
      x: n.position.x,
      y: n.position.y,
      w: typeof styleAny?.width === 'number' ? styleAny.width : undefined,
      h: typeof styleAny?.height === 'number' ? styleAny.height : undefined,
    }
  }

  return { framework, layout: { byNodeId } }
}

