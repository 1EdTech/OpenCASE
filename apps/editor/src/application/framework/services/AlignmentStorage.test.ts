import { describe, it, expect } from 'vitest'
import { alignmentMoveCount, planAlignmentStorage, saveWithAlignmentStorage, type AlignmentStoragePort } from './AlignmentStorage'
import { buildAlignmentFrameworkPackage } from '@/domain/framework/alignmentFrameworks'
import type { CFAssociation } from '@/domain/case/types'
import type { AlignmentStorage, Association, Framework, Item } from '@/domain/framework/model/types'
import type { AssociationId, FrameworkId, ItemId } from '@/domain/shared/types'

// Science (doc-sci) aligns to Math (doc-math, hosted) and to a curriculum goal on goals.example.org (remote, non-CASE).
const toMath: CFAssociation = {
  identifier: 'to-math',
  associationType: 'isRelatedTo',
  uri: '/ims/case/v1p1/CFAssociations/to-math',
  originNodeURI: { title: 'SCI.1', identifier: 'sci-1', uri: '/ims/case/v1p1/CFItems/sci-1' },
  destinationNodeURI: { title: 'MATH.1', identifier: 'math-1', uri: '/ims/case/v1p1/CFItems/math-1' },
  lastChangeDateTime: '2026-10-30T00:00:00Z',
}
const toGoals: CFAssociation = {
  identifier: 'to-goal',
  associationType: 'isRelatedTo',
  uri: '/ims/case/v1p1/CFAssociations/to-goal',
  originNodeURI: { title: 'SCI.1', identifier: 'sci-1', uri: '/ims/case/v1p1/CFItems/sci-1' },
  destinationNodeURI: { title: 'Goal 8.3.1', identifier: 'goal-8.3.1', uri: 'https://goals.example.org/goals#8.3.1', targetType: 'ext:curriculumGoals' },
  lastChangeDateTime: '2026-10-30T00:00:00Z',
}

const domainAssociation = (a: CFAssociation): Association => ({
  id: a.identifier as AssociationId,
  fromItemId: a.originNodeURI.identifier as ItemId,
  toItemId: a.destinationNodeURI.identifier as ItemId,
  associationType: a.associationType as Association['associationType'],
  metadata: {
    originUri: a.originNodeURI.uri,
    destinationUri: a.destinationNodeURI.uri,
    ...(a.destinationNodeURI.targetType ? { destinationTargetType: a.destinationNodeURI.targetType } : {}),
  },
})

const science = (alignmentStorage: AlignmentStorage, associations: CFAssociation[]): Framework => ({
  id: 'doc-sci' as FrameworkId,
  metadata: { title: 'Science', alignmentStorage },
  items: new Map<ItemId, Item>([['sci-1' as ItemId, { id: 'sci-1' as ItemId, statement: 'SCI.1' }]]),
  associations: new Map(associations.map((a) => [a.identifier as AssociationId, domainAssociation(a)])),
  status: 'Published',
})

type StoredPackage = { CFDocument: { identifier: string; extensions?: Record<string, unknown> }; CFAssociations?: CFAssociation[] }

// Holds Science and its alignment frameworks. Like the real server, an association can only be in one of them.
function fakeServer(scienceAssociations: CFAssociation[], alignmentFrameworks: ReturnType<typeof buildAlignmentFrameworkPackage>[] = []) {
  const stored = new Map<string, StoredPackage>(alignmentFrameworks.map((p) => [p.CFDocument.identifier, p]))
  stored.set('doc-sci', { CFDocument: { identifier: 'doc-sci' }, CFAssociations: scienceAssociations })
  const save = (pkg: StoredPackage) => {
    for (const other of stored.values()) {
      if (other.CFDocument.identifier === pkg.CFDocument.identifier) continue
      const clash = other.CFAssociations?.find((a) => pkg.CFAssociations?.some((b) => b.identifier === a.identifier))
      if (clash) throw new Error(`CFAssociation id '${clash.identifier}' is already used in a different framework`)
    }
    stored.set(pkg.CFDocument.identifier, structuredClone(pkg))
  }
  let ids = 0
  const port: AlignmentStoragePort = {
    listAlignmentFrameworks: async (participantId) =>
      [...stored.values()]
        .filter((p) => p.CFDocument.identifier !== 'doc-sci' && JSON.stringify(p.CFDocument.extensions).includes(`"${participantId}"`))
        .map((p) => ({ sourcedId: p.CFDocument.identifier, extensions: p.CFDocument.extensions })),
    getCfPackage: async (docId) => structuredClone(stored.get(docId)!),
    saveCfPackage: async (pkg) => save(pkg as StoredPackage),
    deleteCfPackage: async (docId) => { stored.delete(docId) },
    lookupItemDocuments: async (identifiers) =>
      Object.fromEntries(identifiers.filter((id) => id === 'math-1').map((id) => [id, { identifier: 'doc-math', title: 'Math' }])),
    newIdentifier: () => `af-new-${++ids}`,
    now: () => '2026-10-30T00:00:00Z',
  }
  const saveFramework = async (pkg: { CFAssociations?: unknown[] }) => {
    save({ CFDocument: { identifier: 'doc-sci' }, CFAssociations: pkg.CFAssociations as CFAssociation[] })
    return { docId: 'doc-sci' }
  }
  return { port, stored, saveFramework }
}

const alignmentFramework = (targetId: string, associations: CFAssociation[]) => buildAlignmentFrameworkPackage({
  identifier: `af-${targetId}`,
  source: { identifier: 'doc-sci', title: 'Science' },
  target: { identifier: targetId, title: targetId },
  creator: 'OpenCASE',
  associations,
  now: '2026-10-30T00:00:00Z',
})

const forked = { docId: 'doc-sci-2', forkedIdentifiers: { 'doc-sci': 'doc-sci-2', 'sci-1': 'sci-1b' } }

const associationIds = (pkg: { CFAssociations?: unknown[] } | undefined) =>
  (pkg?.CFAssociations as CFAssociation[] | undefined ?? []).map((a) => a.identifier)

describe('saveWithAlignmentStorage', () => {
  it('moves associations to hosted frameworks into alignment frameworks; remote ones stay inline', async () => {
    const { port, stored, saveFramework } = fakeServer([toMath, toGoals])
    const { moved } = await saveWithAlignmentStorage({
      framework: science('alignmentFramework', [toMath, toGoals]),
      cfPackage: { CFAssociations: [toMath, toGoals] },
      saveFramework,
      port,
    })

    expect(moved).toBe(true)
    expect(associationIds(stored.get('doc-sci'))).toEqual(['to-goal'])
    const af = stored.get('af-new-1')!
    expect(af.CFDocument.extensions?.['ext:opencase']).toMatchObject({ alignmentSource: { identifier: 'doc-sci' } })
    expect(associationIds(af)).toEqual(['to-math'])
  })

  it('adds to the alignment framework it already owns for that target', async () => {
    const earlier = { ...toMath, identifier: 'earlier' }
    const { port, stored, saveFramework } = fakeServer([toMath], [alignmentFramework('doc-math', [earlier])])
    await saveWithAlignmentStorage({
      framework: science('alignmentFramework', [toMath]),
      cfPackage: { CFAssociations: [toMath] },
      saveFramework,
      port,
    })

    expect([...stored.keys()].sort()).toEqual(['af-doc-math', 'doc-sci'])
    expect(associationIds(stored.get('af-doc-math'))).toEqual(['earlier', 'to-math'])
  })

  it('moves associations from its alignment frameworks inline and deletes them, leaving self alignments', async () => {
    const self = { ...toMath, identifier: 'self', destinationNodeURI: { ...toMath.originNodeURI } }
    const { port, stored, saveFramework } = fakeServer(
      [toGoals],
      [alignmentFramework('doc-math', [toMath]), alignmentFramework('doc-sci', [self])],
    )
    const { moved } = await saveWithAlignmentStorage({
      framework: science('inline', [toGoals]),
      cfPackage: { CFAssociations: [toGoals] },
      saveFramework,
      port,
    })

    expect(moved).toBe(true)
    expect(associationIds(stored.get('doc-sci'))).toEqual(['to-goal', 'to-math'])
    expect([...stored.keys()].sort()).toEqual(['af-doc-sci', 'doc-sci'])
  })

  it('puts the alignment frameworks back when the framework fails to save', async () => {
    const { port, stored } = fakeServer([], [alignmentFramework('doc-math', [toMath])])
    await expect(saveWithAlignmentStorage({
      framework: science('inline', []),
      cfPackage: { CFAssociations: [] },
      saveFramework: async () => { throw new Error('offline') },
      port,
    })).rejects.toThrow('offline')

    expect(associationIds(stored.get('af-doc-math'))).toEqual(['to-math'])
  })

  it('moves nothing when storage already matches the setting', async () => {
    const { port, saveFramework } = fakeServer([toMath])
    const { moved } = await saveWithAlignmentStorage({
      framework: science('inline', [toMath]),
      cfPackage: { CFAssociations: [toMath] },
      saveFramework,
      port,
    })
    expect(moved).toBe(false)
  })

  it('writes moved associations with the identifiers the fork gave the framework', async () => {
    const { port, stored, saveFramework } = fakeServer([toMath])
    await saveWithAlignmentStorage({
      framework: science('alignmentFramework', [toMath]),
      cfPackage: { CFAssociations: [toMath] },
      saveFramework: async (pkg) => ({ ...await saveFramework(pkg), ...forked }),
      port,
    })

    const af = stored.get('af-new-1')!
    expect(af.CFDocument.extensions?.['ext:opencase']).toMatchObject({ alignmentSource: { identifier: 'doc-sci-2' } })
    expect(af.CFAssociations?.[0].originNodeURI.identifier).toBe('sci-1b')
  })

  it('keeps its alignment frameworks pointing at it when the save forks it', async () => {
    const { port, stored, saveFramework } = fakeServer([], [alignmentFramework('doc-math', [toMath])])
    await saveWithAlignmentStorage({
      framework: science('alignmentFramework', []),
      cfPackage: { CFAssociations: [] },
      saveFramework: async (pkg) => ({ ...await saveFramework(pkg), ...forked }),
      port,
    })

    const af = stored.get('af-doc-math')!
    expect(af.CFDocument.extensions?.['ext:opencase']).toMatchObject({
      alignmentSource: { identifier: 'doc-sci-2' },
      alignmentParticipants: [{ identifier: 'doc-sci-2' }, { identifier: 'doc-math' }],
    })
    expect(af.CFAssociations?.[0].originNodeURI.identifier).toBe('sci-1b')
  })
})

describe('planAlignmentStorage', () => {
  it('counts the associations a save will move, without changing anything', async () => {
    const { port, stored } = fakeServer([toMath, toGoals])
    const plan = await planAlignmentStorage({
      framework: science('alignmentFramework', [toMath, toGoals]),
      cfPackage: { CFAssociations: [toMath, toGoals] },
      port,
    })
    expect(alignmentMoveCount(plan)).toBe(1)
    expect([...stored.keys()]).toEqual(['doc-sci'])
  })

  it('counts associations coming back from alignment frameworks', async () => {
    const { port } = fakeServer([], [alignmentFramework('doc-math', [toMath, { ...toMath, identifier: 'to-math-2' }])])
    const plan = await planAlignmentStorage({ framework: science('inline', []), cfPackage: { CFAssociations: [] }, port })
    expect(alignmentMoveCount(plan)).toBe(2)
  })

  it('moves nothing when only remote associations are inline', async () => {
    const { port } = fakeServer([toGoals])
    const plan = await planAlignmentStorage({
      framework: science('alignmentFramework', [toGoals]),
      cfPackage: { CFAssociations: [toGoals] },
      port,
    })
    expect(plan.kind).toBe('none')
  })
})
