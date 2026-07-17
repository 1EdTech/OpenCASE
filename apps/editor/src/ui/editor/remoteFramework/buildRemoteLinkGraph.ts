import type { CSSProperties } from 'react'
import type { CaseEditorEdge, CaseEditorNodeType, ExternalFrameworkNodeData } from '@/ui/editor/reactflow/types'
import type { RemoteItemLink } from '@/ui/editor/remoteFramework/remoteFrameworkTypes'
import { getEdgeMarkers, getEdgeStyle, makeEdgeLabel } from '@/ui/editor/state/editorFactories'

export function remoteLinkEdgeId(linkId: string): string {
  return `remote_link_${linkId}`
}

export function remoteLinkIdFromEdgeId(edgeId: string): string | null {
  if (!edgeId.startsWith('remote_link_')) return null
  return edgeId.slice('remote_link_'.length)
}

function coloredMarkers(associationType: string, color: string) {
  const markers = getEdgeMarkers(associationType)
  const tint = (marker: typeof markers.markerEnd) =>
    marker ? { ...marker, color } : undefined
  return {
    markerEnd: tint(markers.markerEnd),
    markerStart: tint(markers.markerStart),
  }
}

function remoteEdgeStyle(associationType: string, color: string): CSSProperties {
  const base = getEdgeStyle(associationType)
  return {
    ...base,
    stroke: color,
    strokeWidth: 1.5,
    strokeDasharray: base.strokeDasharray ?? '6,4',
  }
}

function colorForLink(nodes: CaseEditorNodeType[], link: RemoteItemLink): string {
  const ext = nodes.find(
    (n) => n.type === 'externalFrameworkNode' && (n.data as ExternalFrameworkNodeData).refId === link.remoteFrameworkRefId,
  )
  return (ext?.data as ExternalFrameworkNodeData | undefined)?.color ?? link.remoteFrameworkColor ?? '#64748b'
}

function findExternalFrameworkNodeId(nodes: CaseEditorNodeType[], refId: string): string | undefined {
  return nodes.find(
    (n) => n.type === 'externalFrameworkNode' && (n.data as ExternalFrameworkNodeData).refId === refId,
  )?.id
}

function remoteBarIndexForLink(links: RemoteItemLink[], linkId: string): { index: number; count: number } {
  const byItem = new Map<string, RemoteItemLink[]>()
  for (const link of links) {
    const list = byItem.get(link.localItemId) ?? []
    list.push(link)
    byItem.set(link.localItemId, list)
  }
  for (const list of byItem.values()) {
    const index = list.findIndex((l) => l.id === linkId)
    if (index >= 0) return { index, count: list.length }
  }
  return { index: 0, count: 1 }
}

export function buildRemoteLinkEdges(
  nodes: CaseEditorNodeType[],
  remoteLinks: RemoteItemLink[],
  selectedEdgeIds: string[] = [],
): CaseEditorEdge[] {
  const nodeIds = new Set(nodes.map((n) => n.id))

  return remoteLinks.flatMap((link) => {
    if (!nodeIds.has(link.localItemId)) return []

    const targetId = findExternalFrameworkNodeId(nodes, link.remoteFrameworkRefId)
    if (!targetId || !nodeIds.has(targetId)) return []

    const color = colorForLink(nodes, link)
    const edgeId = remoteLinkEdgeId(link.id)
    const markers = coloredMarkers(link.associationType, color)
    const { index: remoteBarIndex, count: remoteBarCount } = remoteBarIndexForLink(remoteLinks, link.id)

    return [{
      id: edgeId,
      source: link.localItemId,
      target: targetId,
      type: 'remoteLink',
      label: makeEdgeLabel(link.associationType),
      style: remoteEdgeStyle(link.associationType, color),
      ...(markers.markerEnd ? { markerEnd: markers.markerEnd } : {}),
      ...(markers.markerStart ? { markerStart: markers.markerStart } : {}),
      selectable: true,
      focusable: true,
      reconnectable: false,
      selected: selectedEdgeIds.includes(edgeId),
      zIndex: 1000,
      data: {
        associationType: link.associationType,
        isRemoteLink: true,
        remoteLinkId: link.id,
        remoteBarIndex,
        remoteBarCount,
      },
    } satisfies CaseEditorEdge]
  })
}
