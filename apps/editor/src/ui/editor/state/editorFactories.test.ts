import { describe, it, expect } from 'vitest'
import {
  createEmptyFrameworkGraph,
  createSampleGraph,
  formatAssociationType,
  getEdgeMarkers,
  getEdgeStyle,
  makeCfDocument,
  makeCfItem,
  makeEdgeLabel,
} from './editorFactories'

// ── makeCfItem ─────────────────────────────────────────────────────────

describe('makeCfItem', () => {
  it('creates a CFItem with required fields', () => {
    const item = makeCfItem('id-1', 'Learn stuff')
    expect(item.identifier).toBe('id-1')
    expect(item.fullStatement).toBe('Learn stuff')
    expect(item.uri).toContain('id-1')
    expect(item.lastChangeDateTime).toBeDefined()
  })

  it('merges extras into the item', () => {
    const item = makeCfItem('id-1', 'Learn stuff', {
      humanCodingScheme: '3.NBT.A.1',
      CFItemType: 'Standard',
    })
    expect(item.humanCodingScheme).toBe('3.NBT.A.1')
    expect(item.CFItemType).toBe('Standard')
  })
})

// ── makeCfDocument ─────────────────────────────────────────────────────

describe('makeCfDocument', () => {
  it('creates a CFDocument with required fields', () => {
    const doc = makeCfDocument('doc-1', 'My Framework')
    expect(doc.identifier).toBe('doc-1')
    expect(doc.title).toBe('My Framework')
    expect(doc.uri).toContain('doc-1')
    expect(doc.creator).toBeDefined()
    expect(doc.caseVersion).toBe('1.1')
  })

  it('merges extras into the document', () => {
    const doc = makeCfDocument('doc-1', 'My Framework', {
      frameworkType: 'K-12',
      adoptionStatus: 'Draft',
    })
    expect(doc.frameworkType).toBe('K-12')
    expect(doc.adoptionStatus).toBe('Draft')
  })
})

// ── getEdgeMarkers ─────────────────────────────────────────────────────

describe('getEdgeMarkers', () => {
  it('returns markerEnd for isChildOf', () => {
    const markers = getEdgeMarkers('isChildOf')
    expect(markers.markerEnd).toBeDefined()
    expect(markers.markerStart).toBeUndefined()
  })

  it('returns bidirectional markers for isRelatedTo', () => {
    const markers = getEdgeMarkers('isRelatedTo')
    expect(markers.markerStart).toBeDefined()
    expect(markers.markerEnd).toBeDefined()
  })

  it('returns bidirectional markers for exactMatchOf', () => {
    const markers = getEdgeMarkers('exactMatchOf')
    expect(markers.markerStart).toBeDefined()
    expect(markers.markerEnd).toBeDefined()
  })

  it('returns markerStart for isPartOf (reversed arrow)', () => {
    const markers = getEdgeMarkers('isPartOf')
    expect(markers.markerStart).toBeDefined()
    expect(markers.markerEnd).toBeUndefined()
  })

  it('returns markerEnd for __startsFrom (framework root)', () => {
    const markers = getEdgeMarkers('__startsFrom')
    expect(markers.markerEnd).toBeDefined()
    expect(markers.markerStart).toBeUndefined()
  })
})

// ── getEdgeStyle ───────────────────────────────────────────────────────

describe('getEdgeStyle', () => {
  it('returns dashed style for __startsFrom', () => {
    const style = getEdgeStyle('__startsFrom')
    expect(style.strokeDasharray).toBeDefined()
  })

  it('returns dotted style for exactMatchOf', () => {
    const style = getEdgeStyle('exactMatchOf')
    expect(style.strokeDasharray).toBeDefined()
  })

  it('returns dashed style for isPartOf', () => {
    const style = getEdgeStyle('isPartOf')
    expect(style.strokeDasharray).toBeDefined()
  })

  it('returns solid style for isChildOf', () => {
    const style = getEdgeStyle('isChildOf')
    expect(style.strokeDasharray).toBeUndefined()
    expect(style.strokeWidth).toBe(1.5)
  })
})

// ── formatAssociationType ──────────────────────────────────────────────

describe('formatAssociationType', () => {
  it('formats known association types', () => {
    expect(formatAssociationType('isChildOf')).toBe('child of')
    expect(formatAssociationType('isPartOf')).toBe('part of')
    expect(formatAssociationType('isRelatedTo')).toBe('related to')
    expect(formatAssociationType('precedes')).toBe('precedes')
    expect(formatAssociationType('exactMatchOf')).toBe('exact match')
    expect(formatAssociationType('__startsFrom')).toBe('starts')
  })

  it('returns raw string for unknown types', () => {
    expect(formatAssociationType('customType')).toBe('customType')
  })
})

// ── makeEdgeLabel ──────────────────────────────────────────────────────

describe('makeEdgeLabel', () => {
  it('returns type label without sequence number', () => {
    expect(makeEdgeLabel('isChildOf')).toBe('child of')
  })

  it('includes sequence number when provided', () => {
    expect(makeEdgeLabel('isChildOf', 3)).toBe('3 · child of')
  })
})

// ── createEmptyFrameworkGraph ──────────────────────────────────────────

describe('createEmptyFrameworkGraph', () => {
  it('creates a graph with one framework node and no edges', () => {
    const graph = createEmptyFrameworkGraph({ id: 'fw-test', title: 'Test' })
    expect(graph.nodes).toHaveLength(1)
    expect(graph.edges).toHaveLength(0)
    expect(graph.nodes[0].type).toBe('caseFrameworkNode')
    expect(graph.nodes[0].id).toBe('fw-test')
  })
})

// ── createSampleGraph ──────────────────────────────────────────────────

describe('createSampleGraph', () => {
  it('creates a graph with nodes and edges', () => {
    const graph = createSampleGraph()
    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(graph.edges.length).toBeGreaterThan(0)
  })

  it('has exactly one framework node', () => {
    const graph = createSampleGraph()
    const fwNodes = graph.nodes.filter((n) => n.type === 'caseFrameworkNode')
    expect(fwNodes).toHaveLength(1)
  })
})
