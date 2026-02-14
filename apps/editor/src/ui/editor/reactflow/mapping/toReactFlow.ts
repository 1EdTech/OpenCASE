import type { Association, Framework } from '@/domain/framework/model/types'
import type { ItemId } from '@/domain/shared/types'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { getEdgeMarkers, getEdgeStyle, makeEdgeLabel } from '@/ui/editor/state/editorFactories'
import type { CaseEditorEdge, CaseEditorNodeType, CaseFrameworkNodeType, CaseItemNodeType } from '@/ui/editor/reactflow/types'
import { FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '@/ui/editor/reactflow/types'
import type { CFAssociation, CFDocument, CFItem } from '@/domain/case/types'
import type { LayoutState } from './types'

const DEFAULT_NODE_WIDTH = 280
const DEFAULT_NODE_HEIGHT = 140
const HEADER_SAFE_Y = 96
const NODE_VERTICAL_GAP = 120  // Gap between nodes for edge visibility
const OPENCASE_EXT_KEY = 'ext:opencase'

/** Valid handle IDs on our nodes */
const VALID_HANDLES = new Set(['top', 'bottom', 'left', 'right'])

/**
 * Extract persisted handle positions from a CFAssociation's ext:opencase extension.
 * Returns undefined if no saved handles exist.
 */
function getSavedHandles(
  cfAssociation: CFAssociation | undefined,
  isHierarchical: boolean
): { sourceHandle: string; targetHandle: string } | undefined {
  if (!cfAssociation?.extensions) return undefined
  const ext = (cfAssociation.extensions as Record<string, unknown>)[OPENCASE_EXT_KEY] as
    | { originHandle?: string; destinationHandle?: string }
    | undefined
  if (!ext) return undefined

  const { originHandle, destinationHandle } = ext
  if (!originHandle || !destinationHandle) return undefined
  if (!VALID_HANDLES.has(originHandle) || !VALID_HANDLES.has(destinationHandle)) return undefined

  // Map semantic (origin/destination) handles back to visual (source/target) handles.
  // Hierarchical: visual source = destination node, visual target = origin node
  // Non-hierarchical: visual source = origin node, visual target = destination node
  if (isHierarchical) {
    return { sourceHandle: destinationHandle, targetHandle: originHandle }
  }
  return { sourceHandle: originHandle, targetHandle: destinationHandle }
}

/**
 * Calculate the best handles for connecting two nodes based on their positions.
 * Returns the handles that create the shortest/cleanest edge path.
 */
function getClosestHandles(
  sourcePos: { x: number; y: number },
  sourceSize: { w: number; h: number },
  targetPos: { x: number; y: number },
  targetSize: { w: number; h: number }
): { sourceHandle: string; targetHandle: string } {
  const sourceCenter = { x: sourcePos.x + sourceSize.w / 2, y: sourcePos.y + sourceSize.h / 2 }
  const targetCenter = { x: targetPos.x + targetSize.w / 2, y: targetPos.y + targetSize.h / 2 }
  
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  
  if (absX > absY) {
    if (dx > 0) {
      return { sourceHandle: 'right', targetHandle: 'left' }
    } else {
      return { sourceHandle: 'left', targetHandle: 'right' }
    }
  } else {
    if (dy > 0) {
      return { sourceHandle: 'bottom', targetHandle: 'top' }
    } else {
      return { sourceHandle: 'top', targetHandle: 'bottom' }
    }
  }
}

const nowIso = () => new Date().toISOString()

function mapDomainFrameworkToCfDocument(framework: Framework): CFDocument {
  const meta = framework.metadata ?? {}
  const id = framework.id as unknown as string
  return {
    identifier: id,
    uri: meta.caseUri ?? `urn:case:document:${id}`,
    creator: meta.creator ?? 'District Curriculum Team',
    title: meta.title ?? 'Untitled framework',
    description: meta.description,
    publisher: meta.publisher,
    frameworkType: meta.frameworkType,
    adoptionStatus: meta.adoptionStatus,
    caseVersion: meta.caseVersion,
    version: meta.version,
    language: meta.language,
    notes: meta.notes,
    officialSourceURL: meta.officialSourceURL,
    subject: meta.subject,
    subjectURI: meta.subjectURI,
    statusStartDate: meta.statusStartDate,
    statusEndDate: meta.statusEndDate,
    lastChangeDateTime: meta.lastChangeDateTime ?? nowIso(),
    CFPackageURI: { uri: `urn:case:package:${id}` },
    licenseURI: meta.licenseURI,
  }
}

function mapDomainItemToCfItem(framework: Framework, itemId: string): CFItem {
  const item = framework.items.get(itemId as unknown as ItemId)
  // Defensive: if the caller asks for a missing item, return a minimal stub.
  const statement = item?.statement ?? ''
  const md = (item?.metadata ?? {}) as Record<string, unknown>
  const s = (k: string) => (typeof md[k] === 'string' ? (md[k] as string) : undefined)
  const a = (k: string) => (Array.isArray(md[k]) ? (md[k] as unknown[]).filter((x): x is string => typeof x === 'string') : undefined)

  // Extract colorBand from ext:opencase extension (may be in extensions map or flattened into metadata)
  const rawExtensions = md.extensions as Record<string, unknown> | undefined
  const opencaseExt = (rawExtensions?.[OPENCASE_EXT_KEY] ?? md[OPENCASE_EXT_KEY]) as Record<string, unknown> | undefined
  const colorBand = typeof opencaseExt?.colorBand === 'string' ? opencaseExt.colorBand : s('colorBand')

  return {
    identifier: itemId,
    uri: s('caseUri') ?? `urn:case:item:${itemId}`,
    fullStatement: statement,
    abbreviatedStatement: s('abbreviatedStatement'),
    alternativeLabel: s('alternativeLabel'),
    humanCodingScheme: s('humanCodingScheme'),
    CFItemType: s('CFItemType') ?? item?.type,
    CFItemTypeURI: md.CFItemTypeURI as CFItem['CFItemTypeURI'],
    listEnumeration: s('listEnumeration'),
    subject: a('subject'),
    subjectURI: md.subjectURI as CFItem['subjectURI'],
    educationLevel: a('educationLevel'),
    conceptKeywords: a('conceptKeywords'),
    conceptKeywordsURI: md.conceptKeywordsURI as CFItem['conceptKeywordsURI'],
    notes: s('notes'),
    language: s('language'),
    licenseURI: md.licenseURI as CFItem['licenseURI'],
    statusStartDate: s('statusStartDate'),
    statusEndDate: s('statusEndDate'),
    colorBand: colorBand || undefined,
    lastChangeDateTime: s('lastChangeDateTime') ?? nowIso(),
    extensions: rawExtensions ?? undefined,
    CFDocumentURI: { uri: `urn:case:document:${framework.id as unknown as string}` },
  }
}

function mapDomainAssociationToCfAssociation(framework: Framework, association: Association): CFAssociation {
  const fwId = framework.id as unknown as string
  const assocId = association.id as unknown as string
  const fromId = association.fromItemId as unknown as string
  const toId = association.toItemId as unknown as string
  const md = (association.metadata ?? {}) as Record<string, unknown>
  
  const s = (k: string) => (typeof md[k] === 'string' ? (md[k] as string) : undefined)
  const n = (k: string) => (typeof md[k] === 'number' ? (md[k] as number) : undefined)

  // Reconstruct extensions: caseToDomainFramework spreads extensions directly into metadata
  // (e.g. metadata["ext:opencase"] = {...}), while fromEditorGraph stores them as metadata.extensions.
  // Handle both patterns.
  const rawExtensions = md.extensions as Record<string, unknown> | undefined
  const opencaseExt = md[OPENCASE_EXT_KEY] as Record<string, unknown> | undefined
  const extensions = rawExtensions ?? (opencaseExt ? { [OPENCASE_EXT_KEY]: opencaseExt } : undefined)

  // Reconstruct CFAssociationGroupingURI from metadata
  const groupingId = s('CFAssociationGroupingIdentifier')
  const groupingTitle = s('CFAssociationGroupingTitle')
  const CFAssociationGroupingURI = groupingId
    ? { identifier: groupingId, title: groupingTitle, uri: `urn:case:associationgrouping:${groupingId}` }
    : undefined

  return {
    identifier: assocId,
    uri: s('caseUri') ?? `urn:case:association:${assocId}`,
    associationType: association.associationType,
    originNodeURI: {
      identifier: fromId,
      uri: s('originUri') ?? `urn:case:item:${fromId}`,
    },
    destinationNodeURI: {
      identifier: toId,
      uri: s('destinationUri') ?? `urn:case:item:${toId}`,
    },
    sequenceNumber: n('sequenceNumber'),
    CFAssociationGroupingURI,
    notes: s('notes'),
    lastChangeDateTime: s('lastChangeDateTime') ?? nowIso(),
    CFDocumentURI: { uri: `urn:case:document:${fwId}` },
    extensions,
  }
}

const wrapperNodeClassName = 'bg-transparent border-0 p-0 shadow-none'

function getLayout(layout: LayoutState | undefined, nodeId: string, fallback: { x: number; y: number; w: number; h: number }) {
  const entry = layout?.byNodeId?.[nodeId]
  return {
    position: { x: entry?.x ?? fallback.x, y: entry?.y ?? fallback.y },
    style: { width: entry?.w ?? fallback.w, height: entry?.h ?? fallback.h },
  }
}

/**
 * Project the domain framework graph into React Flow nodes/edges.
 *
 * The returned nodes use the existing CASE-shaped `cfDocument` / `cfItem` payloads
 * so we can migrate incrementally without rewriting all node/panel UI at once.
 */
export function toReactFlowGraph(params: { framework: Framework; layout?: LayoutState }): EditorGraph {
  const { framework, layout } = params
  const fwId = framework.id as unknown as string

  const cfDocument = mapDomainFrameworkToCfDocument(framework)

  const rootLayout = getLayout(layout, fwId, { x: 0, y: HEADER_SAFE_Y, w: 400, h: 160 })
  const fwNode: CaseFrameworkNodeType = {
    id: fwId,
    type: 'caseFrameworkNode',
    position: rootLayout.position,
    style: rootLayout.style,
    data: { cfDocument },
    className: wrapperNodeClassName,
  }

  const nodes: CaseEditorNodeType[] = [fwNode]
  const edges: CaseEditorEdge[] = []

  // Map child -> parent and track associations by their origin/destination for edge data
  const parentByChild = new Map<string, string>()
  const associationByEdgeKey = new Map<string, Association>()
  const associatedItemIds = new Set<string>()
  
  for (const a of framework.associations.values()) {
    const fromId = a.fromItemId as unknown as string
    const toId = a.toItemId as unknown as string
    if (!fromId || !toId) continue

    // Track whether each item participates in any association.
    // Used to avoid recreating synthetic framework "starts" edges for connected items.
    associatedItemIds.add(fromId)
    associatedItemIds.add(toId)
    
    if (a.associationType === 'isChildOf' || a.associationType === 'isPartOf') {
      parentByChild.set(fromId, toId)
    }
    // Store association by edge key (source_target) for lookup when creating edges
    associationByEdgeKey.set(`${toId}_${fromId}`, a) // For hierarchical: parent -> child
    associationByEdgeKey.set(`${fromId}_${toId}`, a) // For non-hierarchical: from -> to
  }

  const itemIds = Array.from(framework.items.keys()).map((x) => x as unknown as string).sort((a, b) => a.localeCompare(b))
  // Start items below the framework node with adequate gap for edge visibility
  let y = HEADER_SAFE_Y + 160 + NODE_VERTICAL_GAP

  for (const itemId of itemIds) {
    const explicitParentId = parentByChild.get(itemId)
    const hasAnyAssociation = associatedItemIds.has(itemId)
    // Only synthesize a framework-root parent for truly isolated items.
    // If a node is connected through any non-hierarchical relationship, preserve
    // the user's intent when they removed the root "starts" edge.
    const parentId = explicitParentId ?? (hasAnyAssociation ? undefined : fwId)
    const cfItem = mapDomainItemToCfItem(framework, itemId)

    const itemLayout = getLayout(layout, itemId, { x: 0, y, w: DEFAULT_NODE_WIDTH, h: DEFAULT_NODE_HEIGHT })
    const node: CaseItemNodeType = {
      id: itemId,
      type: 'caseItemNode',
      position: itemLayout.position,
      style: itemLayout.style,
      data: { cfItem, parentId },
      className: wrapperNodeClassName,
    }
    nodes.push(node)
    y += DEFAULT_NODE_HEIGHT + NODE_VERTICAL_GAP
  }

  const defaultLabelStyle = { fill: '#94a3b8', fontSize: 11, fontWeight: 500 }
  
  // Build a position map for calculating closest handles (use actual node sizes)
  const nodePositions = new Map<string, { x: number; y: number; w: number; h: number }>()
  for (const node of nodes) {
    const styleAny = node.style as { width?: number; height?: number } | undefined
    nodePositions.set(node.id, { 
      x: node.position.x, 
      y: node.position.y,
      w: typeof styleAny?.width === 'number' ? styleAny.width : DEFAULT_NODE_WIDTH,
      h: typeof styleAny?.height === 'number' ? styleAny.height : DEFAULT_NODE_HEIGHT,
    })
  }

  // Hierarchy edges: visually flow parent → child
  // Semantic relationship: child isChildOf parent (or __startsFrom for framework connections)
  // Arrow points to child (markerEnd on target)
  for (const itemId of itemIds) {
    const explicitParentId = parentByChild.get(itemId)
    const hasAnyAssociation = associatedItemIds.has(itemId)
    if (!explicitParentId && hasAnyAssociation) {
      // Connected item without a hierarchical parent: don't recreate a synthetic
      // framework-root edge that the user intentionally removed.
      continue
    }
    const parentId = explicitParentId ?? fwId
    const association = associationByEdgeKey.get(`${parentId}_${itemId}`) ?? associationByEdgeKey.get(`${itemId}_${parentId}`)
    const cfAssociation = association ? mapDomainAssociationToCfAssociation(framework, association) : undefined
    const md = (association?.metadata ?? {}) as Record<string, unknown>
    // Use __startsFrom for framework connections (visual-only), isChildOf for item-to-item
    const isFrameworkConnection = parentId === fwId
    // Framework connections use the local-only __startsFrom type for visualization
    // Item-to-item connections use the real CASE association type
    const defaultAssocType = isFrameworkConnection ? FRAMEWORK_ROOT_ASSOCIATION_TYPE : 'isChildOf'
    const assocType = isFrameworkConnection ? FRAMEWORK_ROOT_ASSOCIATION_TYPE : (association?.associationType ?? defaultAssocType)
    const seqNum = typeof md.sequenceNumber === 'number' ? md.sequenceNumber : undefined
    const markers = getEdgeMarkers(assocType)
    
    // Use persisted handle positions if available, otherwise auto-calculate
    const savedHandles = getSavedHandles(cfAssociation, true)
    const parentPos = nodePositions.get(parentId)
    const childPos = nodePositions.get(itemId)
    const handles = savedHandles
      ?? (parentPos && childPos
        ? getClosestHandles(
            { x: parentPos.x, y: parentPos.y },
            { w: parentPos.w, h: parentPos.h },
            { x: childPos.x, y: childPos.y },
            { w: childPos.w, h: childPos.h }
          )
        : { sourceHandle: 'bottom', targetHandle: 'top' }) // Default fallback
    
    // Detect hierarchy layout pattern: bottom→left handles indicate the hierarchy layout was applied
    const isHierarchyLayout = handles.sourceHandle === 'bottom' && handles.targetHandle === 'left'

    edges.push({
      id: `e_${parentId}_${itemId}`,
      source: parentId,      // Visual: edge starts at parent
      target: itemId,        // Visual: edge ends at child (arrow points here)
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: makeEdgeLabel(assocType, seqNum),
      labelStyle: defaultLabelStyle,
      style: getEdgeStyle(assocType),
      ...markers,
      data: {
        cfAssociation, // Preserve original association data for round-trip persistence
        isHierarchical: true,
        associationType: assocType,
        sequenceNumber: seqNum,
        // Track semantic origin/destination
        semanticOrigin: itemId,
        semanticDestination: parentId,
        // Flag for UI to lock this edge type (framework root connections are visual-only)
        isFrameworkRootConnection: isFrameworkConnection,
        // Restore per-edge rendering hints when hierarchy layout handles are detected
        ...(isHierarchyLayout ? { edgeType: 'smoothstep', labelPosition: 'target' as const } : {}),
      },
    })
  }

  // Non-hierarchical associations as edges (source=from, target=to).
  for (const a of framework.associations.values()) {
    if (a.associationType === 'isChildOf' || a.associationType === 'isPartOf') continue
    const fromId = a.fromItemId as unknown as string
    const toId = a.toItemId as unknown as string
    if (!fromId || !toId) continue
    
    const cfAssociation = mapDomainAssociationToCfAssociation(framework, a)
    const md = (a.metadata ?? {}) as Record<string, unknown>
    const seqNum = typeof md.sequenceNumber === 'number' ? md.sequenceNumber : undefined
    const markers = getEdgeMarkers(a.associationType)
    
    // Use persisted handle positions if available, otherwise auto-calculate
    const savedNhHandles = getSavedHandles(cfAssociation, false)
    const fromPos = nodePositions.get(fromId)
    const toPos = nodePositions.get(toId)
    const handles = savedNhHandles
      ?? (fromPos && toPos
        ? getClosestHandles(
            { x: fromPos.x, y: fromPos.y },
            { w: fromPos.w, h: fromPos.h },
            { x: toPos.x, y: toPos.y },
            { w: toPos.w, h: toPos.h }
          )
        : { sourceHandle: 'right', targetHandle: 'left' }) // Default fallback
    
    edges.push({
      id: a.id as unknown as string,
      source: fromId,
      target: toId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      label: makeEdgeLabel(a.associationType, seqNum),
      labelStyle: defaultLabelStyle,
      style: getEdgeStyle(a.associationType),
      ...markers,
      data: {
        cfAssociation,
        isHierarchical: false,
        associationType: a.associationType,
        sequenceNumber: seqNum,
      },
    })
  }

  // Ensure all edges reference existing nodes.
  const nodeIdSet = new Set(nodes.map((n) => n.id))
  const safeEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))

  return { nodes: nodes as CaseEditorNodeType[], edges: safeEdges }
}

