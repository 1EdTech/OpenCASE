import type { CFItem } from '@/domain/case/types'

export interface FrameworkTreeNode {
  id: string
  cfItem: CFItem
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
 * @param cfItems    All CFItems in the framework.
 * @param edges      Parent→child relationships (item-to-item only, no framework-root edges).
 * @param rootItemIds Top-level item IDs in sequence order (pre-sorted by the caller).
 */
export function buildFrameworkTree(
  cfItems: CFItem[],
  edges: FrameworkEdgeRecord[],
  rootItemIds: string[],
): FrameworkTreeNode[] {
  const itemById = new Map(cfItems.map((item) => [item.identifier, item]))

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

  function buildNode(id: string, depth: number): FrameworkTreeNode | null {
    const item = itemById.get(id)
    if (!item) return null
    const childEntries = childrenOf.get(id) ?? []
    const children = childEntries
      .map((e) => buildNode(e.childId, depth + 1))
      .filter((n): n is FrameworkTreeNode => n !== null)
    return { id, cfItem: item, children, depth }
  }

  return rootItemIds
    .map((id) => buildNode(id, 0))
    .filter((n): n is FrameworkTreeNode => n !== null)
}
