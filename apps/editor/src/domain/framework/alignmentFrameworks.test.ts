import { describe, it, expect } from 'vitest'
import {
  alignmentFrameworkSourceId,
  alignmentFrameworkTargetId,
  buildAlignmentFrameworkPackage,
  mergeAssociations,
  remapAlignmentFramework,
} from './alignmentFrameworks'
import type { CFAssociation } from '@/domain/case/types'

const ref = (identifier: string) => ({ identifier, uri: `/ims/case/v1p1/CFDocuments/${identifier}` })

describe('alignmentFrameworkSourceId', () => {
  it('uses alignmentSource when present', () => {
    expect(alignmentFrameworkSourceId({
      alignmentSource: ref('doc-b'),
      alignmentParticipants: [ref('doc-a'), ref('doc-b')],
    })).toBe('doc-b')
  })

  it('falls back to the first participant for alignment frameworks saved without alignmentSource', () => {
    expect(alignmentFrameworkSourceId({ alignmentParticipants: [ref('doc-a'), ref('doc-b')] })).toBe('doc-a')
  })

  it('is undefined when there is nothing to go on', () => {
    expect(alignmentFrameworkSourceId(undefined)).toBeUndefined()
    expect(alignmentFrameworkSourceId({ alignmentParticipants: [] })).toBeUndefined()
  })
})

describe('alignmentFrameworkTargetId', () => {
  it('is the participant other than the source', () => {
    expect(alignmentFrameworkTargetId({
      alignmentSource: ref('doc-a'),
      alignmentParticipants: [ref('doc-a'), ref('doc-b')],
    })).toBe('doc-b')
  })

  it('works out the target of a legacy alignment framework from participant order', () => {
    expect(alignmentFrameworkTargetId({ alignmentParticipants: [ref('doc-a'), ref('doc-b')] })).toBe('doc-b')
  })

  it('is the source itself for a self alignment', () => {
    expect(alignmentFrameworkTargetId({ alignmentParticipants: [ref('doc-a'), ref('doc-a')] })).toBe('doc-a')
  })

  it('is undefined when the source is unknown', () => {
    expect(alignmentFrameworkTargetId({ alignmentParticipants: [{ uri: '/x' }] })).toBeUndefined()
  })
})

const assoc = (identifier: string, from: string, to: string): CFAssociation => ({
  identifier,
  associationType: 'isRelatedTo',
  uri: `/ims/case/v1p1/CFAssociations/${identifier}`,
  originNodeURI: { title: from, identifier: from, uri: `/ims/case/v1p1/CFItems/${from}` },
  destinationNodeURI: { title: to, identifier: to, uri: `/ims/case/v1p1/CFItems/${to}` },
  lastChangeDateTime: '2026-10-30T00:00:00Z',
})

describe('buildAlignmentFrameworkPackage', () => {
  const build = (targetId: string) => buildAlignmentFrameworkPackage({
    identifier: 'af-1',
    source: { identifier: 'doc-a', title: 'A' },
    target: { identifier: targetId, title: targetId === 'doc-a' ? 'A' : 'B' },
    creator: 'Me',
    associations: [assoc('x', 'a-1', 'b-1')],
    now: '2026-10-30T00:00:00Z',
  })

  it('is owned by the source and names both frameworks as participants', () => {
    const pkg = build('doc-b')
    expect(pkg.CFDocument.title).toBe('Alignment: A → B')
    expect(alignmentFrameworkSourceId(pkg.CFDocument.extensions['ext:opencase'])).toBe('doc-a')
    expect(alignmentFrameworkTargetId(pkg.CFDocument.extensions['ext:opencase'])).toBe('doc-b')
    expect(pkg.CFAssociations.map((a) => a.identifier)).toEqual(['x'])
  })

  it('titles a self alignment as internal', () => {
    expect(build('doc-a').CFDocument.title).toBe('Internal Alignment: A')
  })
})

describe('mergeAssociations', () => {
  it('adds only associations not already present, without the package they came from', () => {
    const moved = { ...assoc('y', 'a-2', 'b-2'), CFDocumentURI: { title: 'B', identifier: 'af-1', uri: '/x' } }
    const merged = mergeAssociations([assoc('x', 'a-1', 'b-1')], [assoc('x', 'a-1', 'b-1'), moved])
    expect(merged.map((a) => a.identifier)).toEqual(['x', 'y'])
    expect(merged[1].CFDocumentURI).toBeUndefined()
  })
})

describe('remapAlignmentFramework', () => {
  const pkg = () => buildAlignmentFrameworkPackage({
    identifier: 'af-1',
    source: { identifier: 'doc-a', title: 'A' },
    target: { identifier: 'doc-b', title: 'B' },
    creator: 'Me',
    associations: [assoc('x', 'a-1', 'b-1')],
    now: '2026-10-30T00:00:00Z',
  })

  it('follows the source framework to its forked identifiers, leaving the target alone', () => {
    const remapped = remapAlignmentFramework(pkg(), { 'doc-a': 'doc-a2', 'a-1': 'a-1x' })!
    const ext = remapped.CFDocument.extensions['ext:opencase']
    expect(ext.alignmentSource).toEqual({ identifier: 'doc-a2', uri: '/ims/case/v1p1/CFDocuments/doc-a2' })
    expect(ext.alignmentParticipants?.map((p) => p.identifier)).toEqual(['doc-a2', 'doc-b'])
    expect(remapped.CFAssociations[0].originNodeURI).toEqual({ title: 'a-1', identifier: 'a-1x', uri: '/ims/case/v1p1/CFItems/a-1x' })
    expect(remapped.CFAssociations[0].destinationNodeURI.identifier).toBe('b-1')
  })

  it('is undefined when nothing refers to the forked framework', () => {
    expect(remapAlignmentFramework(pkg(), { 'doc-z': 'doc-z2' })).toBeUndefined()
  })
})
