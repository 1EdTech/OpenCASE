import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ImportCgeCachedFramework } from '../ImportCgeCachedFramework'
import { ImportFramework } from '../../../case/endpoints/ImportFramework'
import { CreateFramework } from '../../../case/endpoints/CreateFramework'
import { GetCFPackage } from '../../../case/endpoints/GetCFPackage'
import { FileFrameworkStore } from '../../../../infrastructure/persistence/file/FileFrameworkStore'
import { FileCFPackageRepository } from '../../../../infrastructure/persistence/file/FileCFPackageRepository'

// A read-only CASE Global cache keeps the publisher's identifiers, so a refresh must
// write a new version of the cached document rather than a second document with the same ids.
describe('ImportCgeCachedFramework — refresh', () => {
  const tenantId = 'test-tenant'
  const caseVersion = '1.1' as const
  const frameworkId = '00000000-0000-4000-8000-000000000100'
  const publisher = 'https://publisher.example.org/ims/case/v1p1'
  const packageUrl = `${publisher}/CFPackages/${frameworkId}`

  const publisherPackage = (statements: string[]) => {
    const docUri = `${publisher}/CFDocuments/${frameworkId}`
    const items = statements.map((s, i) => ({
      identifier: `00000000-0000-4000-8000-00000000010${i + 1}`,
      uri: `${publisher}/CFItems/00000000-0000-4000-8000-00000000010${i + 1}`,
      fullStatement: s,
      lastChangeDateTime: '2026-01-01T00:00:00+00:00'
    }))
    return {
      CFDocument: { identifier: frameworkId, uri: docUri, title: 'Publisher Framework', creator: 'Publisher', lastChangeDateTime: '2026-01-01T00:00:00+00:00' },
      CFItems: items,
      CFAssociations: items.map((it, i) => ({
        identifier: `00000000-0000-4000-8000-00000000090${i + 1}`,
        uri: `${publisher}/CFAssociations/00000000-0000-4000-8000-00000000090${i + 1}`,
        associationType: 'isChildOf',
        lastChangeDateTime: '2026-01-01T00:00:00+00:00',
        originNodeURI: { identifier: it.identifier, uri: it.uri, title: it.fullStatement },
        destinationNodeURI: { identifier: frameworkId, uri: docUri, title: 'Publisher Framework' }
      }))
    }
  }

  let baseDataDir: string
  let store: FileFrameworkStore
  let served: ReturnType<typeof publisherPackage>
  let cacheImport: ImportCgeCachedFramework
  let getPackage: GetCFPackage
  let createFramework: CreateFramework

  beforeEach(async () => {
    baseDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cge-cache-refresh-'))
    store = new FileFrameworkStore({ baseDataDir })
    await store.loadAll()
    const repo = new FileCFPackageRepository(store)
    const cgeApi = {
      resolveFramework: jest.fn(async () => ({ sourceUri: packageUrl, entry: { title: 'Publisher Framework' }, detail: null })),
      createSubscription: jest.fn(),
      fetchPublisherPackage: jest.fn(async () => served)
    }
    cacheImport = new ImportCgeCachedFramework(cgeApi as any, new ImportFramework(repo, {} as any), store)
    getPackage = new GetCFPackage(repo, store)
    createFramework = new CreateFramework(repo, undefined, store)
  })

  afterEach(async () => {
    await fs.rm(baseDataDir, { recursive: true, force: true })
  })

  it('replaces the cached copy with the publisher\'s current content', async () => {
    served = publisherPackage(['First', 'Second'])
    const first = await cacheImport.execute({ tenantId, caseVersion, frameworkId })

    served = publisherPackage(['First, revised', 'Second', 'Third'])
    const refreshed = await cacheImport.execute({ tenantId, caseVersion, frameworkId, refresh: true })

    expect(refreshed.docId).toBe(first.docId)
    expect(refreshed.itemCount).toBe(3)
    const pkg = await getPackage.execute({ tenantId, caseVersion, docId: frameworkId })
    expect(pkg?.CFItems.map((i: any) => i.fullStatement)).toEqual(['First, revised', 'Second', 'Third'])
    expect(store.getAllDocuments(tenantId, caseVersion).filter((d) => d.sourcedId === frameworkId)).toHaveLength(1)
  })

  it('refuses to cache a framework that is already on the server as an editable document', async () => {
    served = publisherPackage(['First'])
    await createFramework.execute({ tenantId, caseVersion, payload: publisherPackage(['First']) } as any)

    await expect(cacheImport.execute({ tenantId, caseVersion, frameworkId })).rejects.toThrow(/already imported as an editable document/)
  })
})
