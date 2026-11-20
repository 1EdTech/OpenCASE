import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ImportFramework } from '../ImportFramework'
import { CreateFramework } from '../CreateFramework'
import { UpdateCFAssociation } from '../UpdateCFAssociation'
import { GetCFPackage } from '../GetCFPackage'
import { GetCFDocument } from '../GetCFDocument'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { FileCFPackageRepository } from '../../../../infrastructure/persistence/file/FileCFPackageRepository'
import type { CaseApiClient } from '../../../../infrastructure/http/CaseApiClient'
import type { CaseVersion } from '../../../../domain/case/value-objects/Identifiers'

// Imports are independent local copies from the start: new identifiers and local
// URIs for everything the framework owns, with its internal references intact.
describe.each(['1.0', '1.1'] as CaseVersion[])('ImportFramework — local copy on import (CASE %s)', (caseVersion) => {
  const tenantId = 'test-tenant'
  const v = caseVersion === '1.1' ? 'v1p1' : 'v1p0'
  const source = `https://source.example.org/ims/case/${v}`
  const sourcePackageUrl = `${source}/CFPackages/src-doc`
  const externalItem = { identifier: 'other-fw-item', uri: 'https://other.example.org/ims/case/v1p1/CFItems/other-fw-item', title: 'Elsewhere' }
  const sourceIds = ['src-doc', 'item-a', 'item-b', 'item-c', 'assoc-1', 'assoc-2', 'assoc-3', 'assoc-4', 'rubric-1', 'crit-1', 'level-1']

  const sourcePackage = () => ({
    CFDocument: {
      identifier: 'src-doc',
      uri: `${source}/CFDocuments/src-doc`,
      CFPackageURI: { identifier: 'src-doc', uri: sourcePackageUrl, title: 'Source' },
      title: 'Source Framework',
      creator: 'Source Org',
      lastChangeDateTime: '2024-01-01T00:00:00+00:00',
      licenseURI: { identifier: 'lic-1', uri: `${source}/CFLicenses/lic-1`, title: 'License' },
      // Incoming OpenCASE state is never trusted.
      extensions: { 'ext:opencase': { publicAccess: true, isModifiedFromSource: false } }
    },
    CFItems: [
      { identifier: 'item-a', uri: `${source}/CFItems/item-a`, fullStatement: 'A', lastChangeDateTime: '2024-01-01T00:00:00+00:00',
        CFItemTypeURI: { identifier: 'type-1', uri: `${source}/CFItemTypes/type-1`, title: 'Standard' } },
      { identifier: 'item-b', uri: `${source}/CFItems/item-b`, fullStatement: 'B', lastChangeDateTime: '2024-01-01T00:00:00+00:00' },
      { identifier: 'item-c', uri: `${source}/CFItems/item-c`, fullStatement: 'C (nested under B)', lastChangeDateTime: '2024-01-01T00:00:00+00:00' }
    ],
    CFAssociations: [
      { identifier: 'assoc-1', uri: `${source}/CFAssociations/assoc-1`, associationType: 'isChildOf', lastChangeDateTime: '2024-01-01T00:00:00+00:00',
        originNodeURI: { identifier: 'item-a', uri: `${source}/CFItems/item-a`, title: 'A' },
        destinationNodeURI: { identifier: 'src-doc', uri: `${source}/CFDocuments/src-doc`, title: 'Source Framework' } },
      { identifier: 'assoc-2', uri: `${source}/CFAssociations/assoc-2`, associationType: 'isChildOf', lastChangeDateTime: '2024-01-01T00:00:00+00:00',
        originNodeURI: { identifier: 'item-b', uri: `${source}/CFItems/item-b`, title: 'B' },
        destinationNodeURI: { identifier: 'item-a', uri: `${source}/CFItems/item-a`, title: 'A' } },
      { identifier: 'assoc-3', uri: `${source}/CFAssociations/assoc-3`, associationType: 'isChildOf', lastChangeDateTime: '2024-01-01T00:00:00+00:00',
        originNodeURI: { identifier: 'item-c', uri: `${source}/CFItems/item-c`, title: 'C' },
        destinationNodeURI: { identifier: 'item-b', uri: `${source}/CFItems/item-b`, title: 'B' } },
      { identifier: 'assoc-4', uri: `${source}/CFAssociations/assoc-4`, associationType: 'exactMatchOf', lastChangeDateTime: '2024-01-01T00:00:00+00:00',
        originNodeURI: { identifier: 'item-a', uri: `${source}/CFItems/item-a`, title: 'A' },
        destinationNodeURI: externalItem }
    ],
    CFRubrics: [{
      identifier: 'rubric-1', uri: `${source}/CFRubrics/rubric-1`, title: 'Rubric', lastChangeDateTime: '2024-01-01T00:00:00+00:00',
      CFRubricCriteria: [{
        identifier: 'crit-1', uri: `${source}/CFRubricCriteria/crit-1`, rubricId: 'rubric-1', lastChangeDateTime: '2024-01-01T00:00:00+00:00',
        CFItemURI: { identifier: 'item-a', uri: `${source}/CFItems/item-a`, title: 'A' },
        CFRubricCriterionLevels: [{
          identifier: 'level-1', uri: `${source}/CFRubricCriterionLevels/level-1`, rubricCriterionId: 'crit-1', lastChangeDateTime: '2024-01-01T00:00:00+00:00'
        }]
      }]
    }],
    CFDefinitions: {
      CFLicenses: [{ identifier: 'lic-1', uri: `${source}/CFLicenses/lic-1`, title: 'License', licenseText: 'Text', lastChangeDateTime: '2024-01-01T00:00:00+00:00' }],
      CFItemTypes: [{ identifier: 'type-1', uri: `${source}/CFItemTypes/type-1`, title: 'Standard', description: 'Standard', hierarchyCode: '1', lastChangeDateTime: '2024-01-01T00:00:00+00:00' }]
    }
  })

  let baseDataDir: string
  let store: FileFrameworkStore
  let importFramework: ImportFramework
  let createFramework: CreateFramework
  let getPackage: GetCFPackage
  let getDocument: GetCFDocument
  let apiClient: jest.Mocked<CaseApiClient>

  beforeEach(async () => {
    baseDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'case-import-local-copy-'))
    store = new FileFrameworkStore({ baseDataDir })
    await store.loadAll()
    const repo = new FileCFPackageRepository(store)
    apiClient = { fetchCFPackage: jest.fn().mockImplementation(async () => ({ CFPackage: sourcePackage() })) } as any
    importFramework = new ImportFramework(repo, apiClient)
    createFramework = new CreateFramework(repo, undefined, store)
    getPackage = new GetCFPackage(repo, store)
    getDocument = new GetCFDocument(repo, store)
  })

  afterEach(async () => {
    await fs.rm(baseDataDir, { recursive: true, force: true })
  })

  const importByUrl = () => importFramework.execute({ tenantId, caseVersion, endpointUrl: sourcePackageUrl })
  const importJson = () => importFramework.execute({ tenantId, caseVersion, cfPackage: sourcePackage() })
  const read = async (docId: string) => {
    const pkg = await getPackage.execute({ tenantId, caseVersion, docId })
    if (!pkg) throw new Error(`No package for ${docId}`)
    return pkg
  }
  const ownedIds = (pkg: any): string[] => [
    pkg.CFDocument.identifier,
    ...pkg.CFItems.map((i: any) => i.identifier),
    ...pkg.CFAssociations.map((a: any) => a.identifier),
    ...(pkg.CFRubrics ?? []).flatMap((r: any) => [
      r.identifier,
      ...(r.CFRubricCriteria ?? []).flatMap((c: any) => [c.identifier, ...(c.CFRubricCriterionLevels ?? []).map((l: any) => l.identifier)])
    ])
  ]
  const itemByStatement = (pkg: any, statement: string) => pkg.CFItems.find((i: any) => i.fullStatement === statement)

  it.each([['URL', importByUrl], ['JSON', importJson]])('gives a %s import new identifiers and local URIs with internal references intact', async (_kind, runImport) => {
    const { docId } = await runImport()
    const pkg = await read(docId)

    expect(pkg.CFDocument.identifier).toBe(docId)
    const ids = ownedIds(pkg)
    expect(ids).toHaveLength(sourceIds.length)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(sourceIds).not.toContain(id)

    const local = `/ims/case/${v}`
    expect(pkg.CFDocument.uri).toBe(`${local}/CFDocuments/${docId}`)
    for (const item of pkg.CFItems) expect(item.uri).toBe(`${local}/CFItems/${item.identifier}`)
    for (const assoc of pkg.CFAssociations) expect(assoc.uri).toBe(`${local}/CFAssociations/${assoc.identifier}`)
    const rubric = pkg.CFRubrics[0]
    expect(rubric.uri).toBe(`${local}/CFRubrics/${rubric.identifier}`)
    for (const owned of ['CFDocuments', 'CFItems', 'CFAssociations', 'CFRubrics', 'CFRubricCriteria', 'CFRubricCriterionLevels']) {
      expect(JSON.stringify(pkg)).not.toContain(`${source}/${owned}/`)
    }

    // Hierarchy and associations point at the copy's own nodes.
    const [a, b, c] = ['A', 'B', 'C (nested under B)'].map(s => itemByStatement(pkg, s))
    const assoc = (originId: string, type: string) =>
      pkg.CFAssociations.find((x: any) => x.originNodeURI.identifier === originId && x.associationType === type)
    expect(assoc(a.identifier, 'isChildOf').destinationNodeURI).toMatchObject({ identifier: docId, uri: `${local}/CFDocuments/${docId}` })
    expect(assoc(b.identifier, 'isChildOf').destinationNodeURI).toMatchObject({ identifier: a.identifier, uri: a.uri })
    expect(assoc(c.identifier, 'isChildOf').destinationNodeURI).toMatchObject({ identifier: b.identifier, uri: b.uri })

    // Keep the full reference to the other publisher.
    expect(assoc(a.identifier, 'exactMatchOf').destinationNodeURI).toEqual(externalItem)

    // Rubric children get new identities and follow the item they assess.
    const criterion = rubric.CFRubricCriteria[0]
    expect(criterion.CFItemURI.identifier).toBe(a.identifier)
    expect(criterion.CFRubricCriterionLevels[0].identifier).not.toBe('level-1')

    // Shared definitions keep their identifiers.
    expect(a.CFItemTypeURI.identifier).toBe('type-1')
    expect(pkg.CFDocument.licenseURI.identifier).toBe('lic-1')
  })

  it('serves the copy through local endpoints, with a local CFPackageURI and the source kept as provenance', async () => {
    const { docId } = await importByUrl()
    const doc = await getDocument.execute({ tenantId, caseVersion, sourcedId: docId })

    expect(doc?.CFPackageURI).toMatchObject({ identifier: docId, uri: `/ims/case/${v}/CFPackages/${docId}` })
    // CASE 1.0 documents carry no extensions, so there is nowhere to keep provenance.
    if (caseVersion === '1.0') return
    const opencase = doc?.extensions?.['ext:opencase']
    expect(opencase?.sourcePackageURI).toBe(sourcePackageUrl)
    expect(opencase).not.toHaveProperty('publicAccess')
  })

  it('keeps the copy\'s identifiers when it is edited and saved', async () => {
    const { docId } = await importJson()
    const before = await read(docId)

    const edited = JSON.parse(JSON.stringify(before))
    itemByStatement(edited, 'B').fullStatement = 'B, edited'
    const saved = await createFramework.execute({ tenantId, caseVersion, payload: edited })

    expect(saved.status).toBe('published')
    expect(saved).not.toHaveProperty('forked', true)
    expect(saved.docId).toBe(docId)
    const after = await read(docId)
    expect(ownedIds(after).sort()).toEqual(ownedIds(before).sort())
    expect(itemByStatement(after, 'B, edited').identifier).toBe(itemByStatement(before, 'B').identifier)
    expect(after.CFAssociations.find((a: any) => a.associationType === 'exactMatchOf').destinationNodeURI).toEqual(externalItem)
  })

  it('keeps external item and document links through edits and a server restart', async () => {
    const pkg = sourcePackage()
    const externalDocument = { identifier: 'other-doc', uri: 'https://other.example.org/ims/case/v1p1/CFDocuments/other-doc', title: 'Other document' }
    pkg.CFAssociations[3].originNodeURI = externalDocument
    const { docId } = await importFramework.execute({ tenantId, caseVersion, cfPackage: pkg })
    const before = await read(docId)
    const checkLinks = (saved: any) => {
      const association = saved.CFAssociations.find((a: any) => a.associationType === 'exactMatchOf')
      expect(association.originNodeURI).toEqual(externalDocument)
      expect(association.destinationNodeURI).toEqual(externalItem)
    }
    checkLinks(before)
    itemByStatement(before, 'B').fullStatement = 'Edited'
    await createFramework.execute({ tenantId, caseVersion, payload: before })
    checkLinks(await read(docId))

    const restartedStore = new FileFrameworkStore({ baseDataDir })
    await restartedStore.loadAll()
    const restartedGet = new GetCFPackage(new FileCFPackageRepository(restartedStore), restartedStore)
    checkLinks(await restartedGet.execute({ tenantId, caseVersion, docId }))
  })

  it('keeps external links when an association is updated directly', async () => {
    const { docId } = await importJson()
    const pkg = await read(docId)
    const association = pkg.CFAssociations.find((a: any) => a.associationType === 'exactMatchOf')
    const update = new UpdateCFAssociation(new FileCFPackageRepository(store), store)
    await update.execute({ tenantId, caseVersion, sourcedId: association.identifier, payload: { ...association, sequenceNumber: 2 } })

    const saved = (await read(docId)).CFAssociations.find((a: any) => a.identifier === association.identifier)
    expect(saved.destinationNodeURI).toEqual(externalItem)
    expect(saved.originNodeURI).toEqual(association.originNodeURI)
    expect(saved.sequenceNumber).toBe(2)
  })

  it('creates a separate copy each time the same source is imported', async () => {
    const first = await importByUrl()
    const firstPkg = await read(first.docId)
    const second = await importByUrl()
    const secondPkg = await read(second.docId)

    expect(second.docId).not.toBe(first.docId)
    const firstIds = new Set(ownedIds(firstPkg))
    for (const id of ownedIds(secondPkg)) expect(firstIds.has(id)).toBe(false)
    expect(await read(first.docId)).toEqual(firstPkg)
  })

  it.each(['URL', 'URN', 'string'])('remaps a rubric item link with only a %s', async (kind) => {
    const pkg = sourcePackage()
    const uri = kind === 'URN' ? 'urn:case:item:item-a' : `${source}/CFItems/item-a`
    pkg.CFRubrics[0].CFRubricCriteria[0].CFItemURI = (kind === 'string' ? uri : { uri, title: 'A' }) as any
    const { docId } = await importFramework.execute({ tenantId, caseVersion, cfPackage: pkg })

    const imported = await read(docId)
    const item = itemByStatement(imported, 'A')
    const criterion = imported.CFRubrics[0].CFRubricCriteria[0]
    expect(criterion.identifier).not.toBe('crit-1')
    expect(criterion.CFItemURI).toEqual({ identifier: item.identifier, uri: item.uri, title: expect.any(String) })
    if (kind !== 'string') expect(criterion.CFItemURI.title).toBe('A')

    item.fullStatement = 'A, edited'
    await createFramework.execute({ tenantId, caseVersion, payload: imported })
    expect((await read(docId)).CFRubrics[0].CFRubricCriteria[0].CFItemURI).toEqual(criterion.CFItemURI)
  })

  it('keeps an unknown rubric item URL instead of guessing from its last path segment', async () => {
    const pkg = sourcePackage()
    const link = { title: 'External', uri: 'https://other.example.org/ims/case/v1p1/CFItems/item-a' }
    pkg.CFRubrics[0].CFRubricCriteria[0].CFItemURI = link as any
    const { docId } = await importFramework.execute({ tenantId, caseVersion, cfPackage: pkg })

    expect((await read(docId)).CFRubrics[0].CFRubricCriteria[0].CFItemURI).toEqual(link)
  })

  it('keeps publisher identities for a read-only cache', async () => {
    const { docId } = await importFramework.execute({
      tenantId, caseVersion, endpointUrl: sourcePackageUrl, documentFlags: { readOnly: true, cgeFrameworkId: 'cge-1' }
    })
    expect(docId).toBe('src-doc')
    // CASE 1.0 documents carry no extensions, so a 1.0 cache has no stored source to point at.
    if (caseVersion === '1.0') return
    const doc = await getDocument.execute({ tenantId, caseVersion, sourcedId: docId })
    expect(doc?.CFPackageURI?.uri).toBe(sourcePackageUrl)
  })
})
