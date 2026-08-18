import type { PublishJob, PublishThroughputSample } from '../publish/PublishJob'

/**
 * Persistence for asynchronous publish jobs and the throughput samples that
 * calibrate duration estimates. Jobs outlive a single HTTP request, so they are
 * stored durably (see FilePublishJobStore) rather than kept only in memory.
 */
export interface PublishJobStore {
  /** Load persisted state and flip any queued/running jobs to `interrupted` (a prior process died mid-run). */
  init: () => Promise<void>
  create: (job: PublishJob) => Promise<void>
  /** Merge a partial update into an existing job (by id). No-op if the id is unknown. */
  update: (id: string, patch: Partial<PublishJob>) => Promise<void>
  get: (id: string) => Promise<PublishJob | null>
  /** Record a completed-run measurement for future estimates. */
  recordSample: (sample: PublishThroughputSample) => Promise<void>
  /** Most recent samples, newest first (bounded). */
  recentSamples: () => Promise<PublishThroughputSample[]>
}
