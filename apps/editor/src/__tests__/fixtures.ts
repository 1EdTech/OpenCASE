/**
 * Shared test fixtures for the CASE editor: factory helpers for graph nodes and edges.
 */
import type { CaseEditorEdge, CaseFrameworkNodeType, CaseItemNodeType } from '@/ui/editor/state/graphTypes'

// ── Node factories ─────────────────────────────────────────────────────

export function makeFrameworkNode(overrides: Partial<CaseFrameworkNodeType> = {}): CaseFrameworkNodeType {
  return {
    id: 'fw-1',
    type: 'caseFrameworkNode',
    data: {
      cfDocument: {
        identifier: 'fw-1',
        uri: 'urn:case:fw-1',
        title: 'Test Framework',
        creator: 'Test',
        CFPackageURI: { uri: 'urn:case:package:fw-1' },
        lastChangeDateTime: '2025-01-01T00:00:00Z',
      },
    },
    ...overrides,
  }
}

export function makeItemNode(id: string, overrides: Partial<CaseItemNodeType> = {}): CaseItemNodeType {
  return {
    id,
    type: 'caseItemNode',
    data: {
      cfItem: {
        identifier: id,
        uri: `urn:case:item:${id}`,
        fullStatement: `Statement for ${id}`,
        lastChangeDateTime: '2025-01-01T00:00:00Z',
      },
    },
    ...overrides,
  }
}

// ── Edge factory ───────────────────────────────────────────────────────

export function makeEdge(
  source: string,
  target: string,
  overrides: Partial<CaseEditorEdge> = {},
): CaseEditorEdge {
  return {
    id: `e_${source}_${target}`,
    source,
    target,
    data: {
      isHierarchical: true,
      associationType: source.startsWith('fw') ? '__startsFrom' : 'isChildOf',
    },
    ...overrides,
  }
}
