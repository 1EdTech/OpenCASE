import fs from 'node:fs/promises'
import path from 'node:path'
import type { PublishJobStore } from '../../application/case/ports/PublishJobStore'
import type { PublishJob, PublishThroughputSample } from '../../application/case/publish/PublishJob'
import { logger } from '../logging/Logger'

export interface FilePublishJobStoreConfig {
  /** Root data directory (same as the framework store); jobs live under `${baseDataDir}/publish-jobs`. */
  baseDataDir: string
  /** How many throughput samples to retain for estimation. Default 50. */
  maxSamples?: number
}

/**
 * Filesystem-backed publish-job store. One JSON file per job under
 * `${baseDataDir}/publish-jobs/<id>.json`, plus a rolling `stats.json` of
 * throughput samples. Jobs are cached in memory and mirrored to disk so a
 * process restart can recover (queued/running -> interrupted) and estimates
 * survive restarts.
 */
export class FilePublishJobStore implements PublishJobStore {
  private readonly dir: string
  private readonly statsFile: string
  private readonly maxSamples: number
  private readonly jobs = new Map<string, PublishJob>()
  private samples: PublishThroughputSample[] = []

  constructor (cfg: FilePublishJobStoreConfig) {
    this.dir = path.join(cfg.baseDataDir, 'publish-jobs')
    this.statsFile = path.join(this.dir, 'stats.json')
    this.maxSamples = cfg.maxSamples ?? 50
  }

  async init (): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })

    // Load throughput samples (best-effort).
    try {
      const raw = await fs.readFile(this.statsFile, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) this.samples = parsed
    } catch (err: any) {
      if (err?.code !== 'ENOENT') logger.warn({ err: err?.message }, 'Publish job stats unreadable; starting empty')
    }

    // Load jobs and recover any that were mid-flight when the process last stopped.
    let entries: string[] = []
    try {
      entries = await fs.readdir(this.dir)
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err
    }
    for (const name of entries) {
      if (!name.endsWith('.json') || name === 'stats.json') continue
      try {
        const raw = await fs.readFile(path.join(this.dir, name), 'utf8')
        const job = JSON.parse(raw) as PublishJob
        if (job.status === 'queued' || job.status === 'running') {
          job.status = 'interrupted'
          job.finishedAt = new Date().toISOString()
          job.error = 'OpenCASE restarted while this job was in progress. Re-submit to publish.'
          await this.persist(job)
          logger.warn({ jobId: job.id, docId: job.docId }, 'Recovered interrupted publish job')
        }
        this.jobs.set(job.id, job)
      } catch (err: any) {
        logger.warn({ file: name, err: err?.message }, 'Skipping unreadable publish job file')
      }
    }
  }

  async create (job: PublishJob): Promise<void> {
    this.jobs.set(job.id, job)
    await this.persist(job)
  }

  async update (id: string, patch: Partial<PublishJob>): Promise<void> {
    const existing = this.jobs.get(id)
    if (!existing) return
    const merged = { ...existing, ...patch, id: existing.id }
    this.jobs.set(id, merged)
    await this.persist(merged)
  }

  async get (id: string): Promise<PublishJob | null> {
    return this.jobs.get(id) ?? null
  }

  async recordSample (sample: PublishThroughputSample): Promise<void> {
    // Newest first; drop oldest beyond the cap.
    this.samples = [sample, ...this.samples].slice(0, this.maxSamples)
    await fs.writeFile(this.statsFile, JSON.stringify(this.samples, null, 2), 'utf8')
  }

  async recentSamples (): Promise<PublishThroughputSample[]> {
    return [...this.samples]
  }

  private async persist (job: PublishJob): Promise<void> {
    await fs.writeFile(path.join(this.dir, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf8')
  }
}
