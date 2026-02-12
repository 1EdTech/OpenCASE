/**
 * Pre-render layout orchestrator.
 *
 * Runs BEFORE React Flow mounts so that nodes appear at their final
 * positions on the first paint (no visible jump). Delegates to the
 * same pure layout functions used by the interactive layout buttons.
 */
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import type { CaseEditorEdge } from '@/ui/editor/reactflow/types'
import type { Topology } from './detectTopology'
import type { LayoutResult } from '@/ui/editor/state/helpers/nodeGeometry'
import { computeHierarchyLayout } from './hierarchyLayout'
import { computeStarLayout } from './starLayout'
import { computeTreeLayout } from './treeLayout'

/** Apply computed positions and edge handles to an EditorGraph. */
function applyResult(graph: EditorGraph, result: LayoutResult): EditorGraph {
  const nodes = graph.nodes.map((n) => {
    const p = result.positions[n.id]
    return p ? { ...n, position: { x: p.x, y: p.y } } : n
  })
  const edges = graph.edges.map((e) => {
    const h = result.edgeHandles[e.id]
    if (!h) return e
    return {
      ...e,
      sourceHandle: h.sourceHandle,
      targetHandle: h.targetHandle,
      data: { ...e.data, edgeType: h.edgeType, labelPosition: h.labelPosition },
    } as CaseEditorEdge
  })
  return { nodes, edges }
}

/**
 * Apply the appropriate auto-layout to a graph that has no saved positions.
 * Returns a new graph with updated node positions and edge handles, plus
 * the edge type to use as the framework-level default.
 */
export function applyInitialLayout(
  graph: EditorGraph,
  topology: Topology,
): { graph: EditorGraph; edgeType: string } {
  switch (topology) {
    case 'hierarchy': {
      const result = computeHierarchyLayout(graph.nodes, graph.edges)
      return { graph: applyResult(graph, result), edgeType: 'smoothstep' }
    }
    case 'star': {
      const result = computeStarLayout(graph.nodes, graph.edges)
      return { graph: applyResult(graph, result), edgeType: 'default' }
    }
    case 'tree':
    default: {
      const result = computeTreeLayout(graph.nodes, graph.edges)
      return { graph: applyResult(graph, result), edgeType: 'default' }
    }
  }
}
