import { PublishJobRunner } from '../PublishJobRunner'
import type { PublishJobStore } from '../../ports/PublishJobStore'
import type { PublishJob, PublishThroughputSample } from '../PublishJob'

/** In-memory PublishJobStore for tests. */
class FakeStore implements PublishJobStore {
  jobs = new Map<string, PublishJob>()
  samples: PublishThroughputSample[] = []
  async init (): Promise<void> {}
  async create (job: PublishJob): Promise<void> { this.jobs.set(job.id, { ...job }) }
  async update (id: string, patch: Partial<PublishJob>): Promise<void> {
    const cur = this.jobs.get(id); if (cur) this.jobs.set(id, { ...cur, ...patch, id })
  }
  async get (id: string): Promise<PublishJob | null> { return this.jobs.get(id) ?? null }
  async recordSample (s: PublishThroughputSample): Promise<void> { this.samples = [s, ...this.samples] }
  async recentSamples (): Promise<PublishThroughputSample[]> { return [...this.samples] }
}

// A fake package whose document/items satisfy the pre-flight validator (description present,
// every item has statement text) unless `valid: false` is requested.
const pkgRepoWith = (itemCount: number, valid = true) => ({
  load: async () => {
    if (itemCount < 0) return null
    const doc = { toJSON: () => ({ description: valid ? 'A framework' : undefined }) }
    const items = new Array(itemCount).fill(null).map((_, i) => ({
      toJSON: () => ({ identifier: `i${i}`, fullStatement: valid ? `stmt ${i}` : '' }),
    }))
    return { document: doc, items }
  },
}) as any

/** A monotonic clock that advances 1000ms per read, for deterministic elapsed times. */
const steppingClock = () => {
  let t = 1_000_000
  return () => { t += 1000; return t }
}

async function waitForTerminal (runner: PublishJobRunner, id: string): Promise<PublishJob> {
  for (let i = 0; i < 200; i++) {
    const j = await runner.get(id)
    if (j && (j.status === 'succeeded' || j.status === 'failed' || j.status === 'interrupted')) return j
    await new Promise((r) => setImmediate(r))
  }
  throw new Error('job did not reach a terminal state')
}

describe('PublishJobRunner', () => {
  it('runs a preview job to success and records a throughput sample', async () => {
    const store = new FakeStore()
    const preview = { execute: jest.fn().mockResolvedValue({ format: { ok: true } }) }
    const publish = { execute: jest.fn() }
    const runner = new PublishJobRunner(pkgRepoWith(42), store, preview as any, publish as any, 'sandbox', steppingClock())

    const submitted = await runner.submit({ tenantId: 't', caseVersion: '1.1', docId: 'd', kind: 'preview' })
    expect(submitted.status).toBe('queued')
    expect(submitted.competencyCount).toBe(42)
    expect(submitted.estimateMs).toBeGreaterThan(0)

    const done = await waitForTerminal(runner, submitted.id)
    expect(done.status).toBe('succeeded')
    expect(done.result).toEqual({ format: { ok: true } })
    expect(preview.execute).toHaveBeenCalledTimes(1)
    expect(publish.execute).not.toHaveBeenCalled()
    expect(done.elapsedMs).toBeGreaterThan(0)
    expect(store.samples).toHaveLength(1)
    expect(store.samples[0].competencyCount).toBe(42)
  })

  it('routes kind=publish to the publish use case', async () => {
    const store = new FakeStore()
    const preview = { execute: jest.fn() }
    const publish = { execute: jest.fn().mockResolvedValue({ ctid: 'ce-x' }) }
    const runner = new PublishJobRunner(pkgRepoWith(3), store, preview as any, publish as any, 'sandbox', steppingClock())

    const submitted = await runner.submit({ tenantId: 't', caseVersion: '1.1', docId: 'd', kind: 'publish', environment: 'production' })
    const done = await waitForTerminal(runner, submitted.id)
    expect(done.status).toBe('succeeded')
    expect(done.environment).toBe('production')
    expect(publish.execute).toHaveBeenCalledTimes(1)
    expect(preview.execute).not.toHaveBeenCalled()
  })

  it('marks the job failed with the error message when the use case throws', async () => {
    const store = new FakeStore()
    const preview = { execute: jest.fn().mockRejectedValue(new Error('RA rejected publish: bad statement')) }
    const runner = new PublishJobRunner(pkgRepoWith(5), store, preview as any, { execute: jest.fn() } as any, 'sandbox', steppingClock())

    const submitted = await runner.submit({ tenantId: 't', caseVersion: '1.1', docId: 'd', kind: 'preview' })
    const done = await waitForTerminal(runner, submitted.id)
    expect(done.status).toBe('failed')
    expect(done.error).toContain('bad statement')
    // Failures must not pollute the throughput samples used for estimates.
    expect(store.samples).toHaveLength(0)
  })

  it('reports live elapsed time while running', async () => {
    const store = new FakeStore()
    // A use case that never resolves keeps the job in "running".
    const preview = { execute: jest.fn().mockReturnValue(new Promise(() => {})) }
    const runner = new PublishJobRunner(pkgRepoWith(1), store, preview as any, { execute: jest.fn() } as any, 'sandbox', steppingClock())

    const submitted = await runner.submit({ tenantId: 't', caseVersion: '1.1', docId: 'd', kind: 'preview' })
    // Let the background run flip to "running".
    await new Promise((r) => setImmediate(r))
    const running = await runner.get(submitted.id)
    expect(running?.status).toBe('running')
    expect(running?.elapsedMs).toBeGreaterThan(0)
  })

  it('surfaces "not found" when the framework is missing', async () => {
    const runner = new PublishJobRunner(pkgRepoWith(-1), new FakeStore(), { execute: jest.fn() } as any, { execute: jest.fn() } as any, 'sandbox', steppingClock())
    await expect(runner.submit({ tenantId: 't', caseVersion: '1.1', docId: 'missing', kind: 'preview' })).rejects.toThrow(/not found/)
  })

  it('estimates without starting a job', async () => {
    const runner = new PublishJobRunner(pkgRepoWith(200), new FakeStore(), { execute: jest.fn() } as any, { execute: jest.fn() } as any, 'sandbox', steppingClock())
    const { competencyCount, estimate, issues } = await runner.estimate({ tenantId: 't', caseVersion: '1.1', docId: 'd' })
    expect(competencyCount).toBe(200)
    expect(estimate.basis).toBe('default')
    expect(estimate.estimateMs).toBeGreaterThan(0)
    expect(issues).toEqual([])
  })

  it('fast-fails submit on a framework that would be rejected (no RA round-trip)', async () => {
    const preview = { execute: jest.fn() }
    const runner = new PublishJobRunner(pkgRepoWith(5, false), new FakeStore(), preview as any, { execute: jest.fn() } as any, 'sandbox', steppingClock())
    await expect(runner.submit({ tenantId: 't', caseVersion: '1.1', docId: 'd', kind: 'preview' })).rejects.toThrow(/isn't ready to publish/)
    expect(preview.execute).not.toHaveBeenCalled() // never reached RA
  })

  it('reports pre-flight issues from estimate for an invalid framework', async () => {
    const runner = new PublishJobRunner(pkgRepoWith(3, false), new FakeStore(), { execute: jest.fn() } as any, { execute: jest.fn() } as any, 'sandbox', steppingClock())
    const { issues } = await runner.estimate({ tenantId: 't', caseVersion: '1.1', docId: 'd' })
    const codes = issues.map((i) => i.code)
    expect(codes).toContain('framework_description_missing')
    expect(codes).toContain('competency_text_missing')
  })
})
