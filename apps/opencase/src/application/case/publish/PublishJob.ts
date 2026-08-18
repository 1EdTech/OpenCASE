import type { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { RegistryEnvironment } from '../../../infrastructure/http/RegistryAssistantClient'

/** What the job does: `preview` = dry-run (/format, publishes nothing); `publish` = writes to the registry. */
export type PublishJobKind = 'preview' | 'publish'

/**
 * Lifecycle:
 *  queued      -> accepted, not yet started
 *  running     -> Registry Assistant call in flight
 *  succeeded   -> RA returned OK; `result` holds the preview/publish payload
 *  failed      -> RA rejected or an error was thrown; `error` holds the message
 *  interrupted -> the process restarted while queued/running; safe to re-submit
 */
export type PublishJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted'

export interface PublishJob {
  id: string
  tenantId: TenantId
  caseVersion: CaseVersion
  docId: SourcedId
  kind: PublishJobKind
  environment: RegistryEnvironment
  status: PublishJobStatus
  /** Number of competencies in the framework — the size driver for the estimate. */
  competencyCount?: number
  /** Estimated total duration (ms) computed at submit time from recorded throughput. */
  estimateMs?: number
  createdAt: string
  startedAt?: string
  finishedAt?: string
  /** Wall-clock duration once finished (finishedAt - startedAt). */
  elapsedMs?: number
  /** Failure message (present when status === 'failed'). */
  error?: string
  /** PreviewPublishResult or PublishResult (present when status === 'succeeded'). */
  result?: unknown
}

/** A completed-run measurement used to calibrate future duration estimates. */
export interface PublishThroughputSample {
  competencyCount: number
  elapsedMs: number
  at: string
}
