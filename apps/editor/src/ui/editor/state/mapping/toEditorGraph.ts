import type { Association, Framework } from '@/domain/framework/model/types'
import type { ItemId } from '@/domain/shared/types'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import type { CaseEditorEdge, CaseEditorNodeType, CaseFrameworkNodeType, CaseItemNodeType } from '@/ui/editor/state/graphTypes'
import { FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '@/ui/editor/state/graphTypes'
import type { CFAssociation, CFDocument, CFItem } from '@/domain/case/types'

const OPENCASE_EXT_KEY = 'ext:opencase'

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
    publicAccess: meta.publicAccess === true ? true : undefined,
    alignmentStorage: meta.alignmentStorage,
    extensions: meta.extensions,
  }
}

function mapDomainItemToCfItem(framework: Framework, itemId: string): CFItem {
  const item = framework.items.get(itemId as unknown as ItemId)
  // Defensive: if the caller asks for a missing item, return a minimal stub.
  const statement = item?.statement ?? ''
  const md = (item?.metadata ?? {}) as Record<string, unknown>
  const s = (k: string) => (typeof md[k] === 'string' ? (md[k] as string) : undefined)
  const a = (k: string) => (Array.isArray(md[k]) ? (md[k] as unknown[]).filter((x): x is string => typeof x === 'string') : undefined)

  // Extract colorBand from ext:opencase extension (in the extensions map; a top-level
  // metadata['ext:opencase'] key is accepted for frameworks mapped by older builds)
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

  // Extensions live in metadata.extensions (both caseToDomainFramework and fromEditorGraph).
  // A top-level metadata["ext:opencase"] key is accepted for frameworks mapped by older builds.
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
      title: s('originTitle'),
    },
    destinationNodeURI: {
      identifier: toId,
      uri: s('destinationUri') ?? `urn:case:item:${toId}`,
      title: s('destinationTitle'),
    },
    sequenceNumber: n('sequenceNumber'),
    CFAssociationGroupingURI,
    notes: s('notes'),
    lastChangeDateTime: s('lastChangeDateTime') ?? nowIso(),
    CFDocumentURI: { uri: `urn:case:document:${fwId}` },
    extensions,
  }
}

/**
 * Project the domain framework into the editor graph: a node for the
 * CFDocument and each item, and an edge for each association between them.
 * Associations to anything outside the framework have no edge; the editor
 * carries them through on save (see withOffCanvasAssociations).
 */
export function toEditorGraph(params: { framework: Framework }): EditorGraph {
  const { framework } = params
  const fwId = framework.id as unknown as string

  const fwNode: CaseFrameworkNodeType = {
    id: fwId,
    type: 'caseFrameworkNode',
    data: { cfDocument: mapDomainFrameworkToCfDocument(framework) },
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

  for (const itemId of itemIds) {
    const explicitParentId = parentByChild.get(itemId)
    const hasAnyAssociation = associatedItemIds.has(itemId)
    // Only synthesize a framework-root parent for truly isolated items.
    // If a node is connected through any non-hierarchical relationship, preserve
    // the user's intent when they removed the root "starts" edge.
    const parentId = explicitParentId ?? (hasAnyAssociation ? undefined : fwId)
    const node: CaseItemNodeType = {
      id: itemId,
      type: 'caseItemNode',
      data: { cfItem: mapDomainItemToCfItem(framework, itemId), parentId },
    }
    nodes.push(node)
  }

  // Hierarchy edges run parent → child.
  // Semantic relationship: child isChildOf parent (or __startsFrom for framework connections)
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
    // Framework connections use the local-only __startsFrom type; item-to-item ones the real CASE type
    const isFrameworkConnection = parentId === fwId
    const assocType = isFrameworkConnection ? FRAMEWORK_ROOT_ASSOCIATION_TYPE : (association?.associationType ?? 'isChildOf')
    const seqNum = typeof md.sequenceNumber === 'number' ? md.sequenceNumber : undefined

    edges.push({
      id: `e_${parentId}_${itemId}`,
      source: parentId,
      target: itemId,
      data: {
        cfAssociation, // Preserve original association data for round-trip persistence
        isHierarchical: true,
        associationType: assocType,
        sequenceNumber: seqNum,
        semanticOrigin: itemId,
        semanticDestination: parentId,
        isFrameworkRootConnection: isFrameworkConnection,
      },
    })
  }

  // Non-hierarchical associations as edges (source=from, target=to).
  for (const a of framework.associations.values()) {
    if (a.associationType === 'isChildOf' || a.associationType === 'isPartOf') continue
    const fromId = a.fromItemId as unknown as string
    const toId = a.toItemId as unknown as string
    if (!fromId || !toId) continue

    const md = (a.metadata ?? {}) as Record<string, unknown>
    edges.push({
      id: a.id as unknown as string,
      source: fromId,
      target: toId,
      data: {
        cfAssociation: mapDomainAssociationToCfAssociation(framework, a),
        isHierarchical: false,
        associationType: a.associationType,
        sequenceNumber: typeof md.sequenceNumber === 'number' ? md.sequenceNumber : undefined,
      },
    })
  }

  // Ensure all edges reference existing nodes.
  const nodeIdSet = new Set(nodes.map((n) => n.id))
  const safeEdges = edges.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))

  return { nodes, edges: safeEdges }
}
