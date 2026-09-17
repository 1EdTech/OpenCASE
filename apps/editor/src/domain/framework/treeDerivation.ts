export interface FrameworkTreeNode {
  id: string
  children: FrameworkTreeNode[]
  depth: number
}

/** Minimal edge record — always derivable from React Flow edge source/target/flags. */
export type FrameworkEdgeRecord = {
  parentId: string
  childId: string
  sequenceNumber?: number
}

/**
 * Pure domain function — no React Flow imports.
 *
 * Builds only the tree SHAPE (id/children/depth) from parent→child edges.
 * Item content (CFItem) is intentionally NOT embedded here — callers look it
 * up separately (e.g. by id, from a Map) so that editing an item's own field
 * data doesn't change this shape and force a full tree rebuild; only actual
 * structural changes (items added/removed/reparented) should.
 *
 * @param edges       Parent→child relationships (item-to-item only, no framework-root edges).
 * @param rootItemIds Top-level item IDs in sequence order (pre-sorted by the caller).
 */
export function buildFrameworkTree(
  edges: FrameworkEdgeRecord[],
  rootItemIds: string[],
): FrameworkTreeNode[] {
  // Build parent → [{childId, seq}] map
  const childrenOf = new Map<string, { childId: string; seq: number }[]>()
  for (const edge of edges) {
    const entry = childrenOf.get(edge.parentId) ?? []
    entry.push({ childId: edge.childId, seq: edge.sequenceNumber ?? Infinity })
    childrenOf.set(edge.parentId, entry)
  }

  // Sort each child list by sequence number
  for (const entry of childrenOf.values()) {
    entry.sort((a, b) => a.seq - b.seq)
  }

  function buildNode(id: string, depth: number, visiting: Set<string>): FrameworkTreeNode | null {
    if (visiting.has(id)) return null // cycle guard: malformed/cyclic hierarchical data
    visiting.add(id)
    const childEntries = childrenOf.get(id) ?? []
    const children = childEntries
      .map((e) => buildNode(e.childId, depth + 1, visiting))
      .filter((n): n is FrameworkTreeNode => n !== null)
    visiting.delete(id)
    return { id, children, depth }
  }

  return rootItemIds
    .map((id) => buildNode(id, 0, new Set()))
    .filter((n): n is FrameworkTreeNode => n !== null)
}
