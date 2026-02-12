import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { buildAdjacency, isFrameworkNode } from '@/ui/editor/state/helpers/nodeGeometry'

export type Topology = 'hierarchy' | 'star' | 'tree'

/**
 * Analyse an EditorGraph (before first render) and decide which
 * auto-layout mode best fits its structure.
 *
 * - **hierarchy** – most items are direct children of the framework node
 *   with few/no item-to-item associations (flat competency list).
 * - **star** – multiple "start" nodes each with their own item children
 *   (multi-branch competency framework).
 * - **tree** – fallback generic tree-spread for anything else.
 */
export function detectTopology(graph: EditorGraph): Topology {
  const { nodes, edges } = graph

  // Find the framework node
  const frameworkNode = nodes.find(isFrameworkNode)
  if (!frameworkNode) return 'tree'

  // Build parent → children adjacency from visual edges
  const { childrenOf } = buildAdjacency(edges)

  // Start nodes: direct children of the framework
  const startNodeIds = childrenOf.get(frameworkNode.id) ?? []
  if (!startNodeIds.length) return 'tree'

  // Count how many start nodes have their own item children
  let startNodesWithChildren = 0
  for (const id of startNodeIds) {
    const kids = childrenOf.get(id) ?? []
    if (kids.length > 0) startNodesWithChildren++
  }

  // Count item-to-item edges (edges whose source is NOT the framework)
  const itemToItemEdgeCount = edges.filter(
    (e) => e.source !== frameworkNode.id,
  ).length

  // ── Heuristics ───────────────────────────────────────────────────────
  //
  // Star: at least 2 start nodes have their own children.
  if (startNodesWithChildren >= 2) return 'star'

  // Hierarchy: most items are direct framework children and there are
  // very few (or zero) item-to-item relationships.
  if (itemToItemEdgeCount < startNodeIds.length * 0.5) return 'hierarchy'

  // Default fallback
  return 'tree'
}
