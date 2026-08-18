import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { FilePublishJobStore } from '../FilePublishJobStore'
import type { PublishJob } from '../../../application/case/publish/PublishJob'

const job = (over: Partial<PublishJob> = {}): PublishJob => ({
  id: 'job-1',
  tenantId: 't',
  caseVersion: '1.1',
  docId: 'd',
  kind: 'publish',
  environment: 'sandbox',
  status: 'queued',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'publishjobs-'))
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('FilePublishJobStore', () => {
  it('persists a job and reloads it in a fresh store instance', async () => {
    const store = new FilePublishJobStore({ baseDataDir: dir })
    await store.init()
    await store.create(job({ id: 'abc', status: 'succeeded' }))

    const reopened = new FilePublishJobStore({ baseDataDir: dir })
    await reopened.init()
    const loaded = await reopened.get('abc')
    expect(loaded?.id).toBe('abc')
    expect(loaded?.status).toBe('succeeded')
  })

  it('recovers queued/running jobs to interrupted on init', async () => {
    const store = new FilePublishJobStore({ baseDataDir: dir })
    await store.init()
    await store.create(job({ id: 'was-running', status: 'running', startedAt: '2026-01-01T00:00:01.000Z' }))
    await store.create(job({ id: 'was-queued', status: 'queued' }))
    await store.create(job({ id: 'was-done', status: 'succeeded' }))

    const reopened = new FilePublishJobStore({ baseDataDir: dir })
    await reopened.init()
    expect((await reopened.get('was-running'))?.status).toBe('interrupted')
    expect((await reopened.get('was-queued'))?.status).toBe('interrupted')
    expect((await reopened.get('was-done'))?.status).toBe('succeeded')
    expect((await reopened.get('was-running'))?.error).toMatch(/restarted/i)
  })

  it('merges partial updates without losing other fields', async () => {
    const store = new FilePublishJobStore({ baseDataDir: dir })
    await store.init()
    await store.create(job({ id: 'j', competencyCount: 10 }))
    await store.update('j', { status: 'succeeded', result: { ok: true } })
    const loaded = await store.get('j')
    expect(loaded?.status).toBe('succeeded')
    expect(loaded?.competencyCount).toBe(10)
    expect(loaded?.result).toEqual({ ok: true })
  })

  it('retains bounded throughput samples, newest first', async () => {
    const store = new FilePublishJobStore({ baseDataDir: dir, maxSamples: 2 })
    await store.init()
    await store.recordSample({ competencyCount: 1, elapsedMs: 100, at: 'a' })
    await store.recordSample({ competencyCount: 2, elapsedMs: 200, at: 'b' })
    await store.recordSample({ competencyCount: 3, elapsedMs: 300, at: 'c' })
    const samples = await store.recentSamples()
    expect(samples).toHaveLength(2)
    expect(samples[0].competencyCount).toBe(3) // newest first
    expect(samples[1].competencyCount).toBe(2)

    // Samples survive a restart.
    const reopened = new FilePublishJobStore({ baseDataDir: dir, maxSamples: 2 })
    await reopened.init()
    expect(await reopened.recentSamples()).toHaveLength(2)
  })
})
