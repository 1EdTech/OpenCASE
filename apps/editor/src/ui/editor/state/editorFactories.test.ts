import { describe, it, expect } from 'vitest'
import {
  createEmptyFrameworkGraph,
  createSampleGraph,
  makeCfDocument,
  makeCfItem,
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
