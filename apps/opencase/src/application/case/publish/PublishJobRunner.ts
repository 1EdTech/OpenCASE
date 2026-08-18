import { randomUUID } from 'node:crypto'
import type { CaseVersion, SourcedId, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { RegistryEnvironment } from '../../../infrastructure/http/RegistryAssistantClient'
import type { CFPackageRepository } from '../ports/CFPackageRepository'
import type { PublishJobStore } from '../ports/PublishJobStore'
import type { PreviewPublishToRegistry } from '../endpoints/PreviewPublishToRegistry'
import type { PublishFrameworkToRegistry } from '../endpoints/PublishFrameworkToRegistry'
import { estimateDuration, type DurationEstimate } from './estimateDuration'
import { validatePublishInputs, type PublishValidationIssue } from './validatePublishInputs'
import type { PublishJob, PublishJobKind } from './PublishJob'
import type { CFPackage } from '../../../domain/case/entities/CFPackage'
import { logger } from '../../../infrastructure/logging/Logger'

export interface SubmitPublishJobCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  docId: SourcedId
  kind: PublishJobKind
  environment?: RegistryEnvironment
}

export interface PublishEstimateResult {
  competencyCount: number
  estimate: DurationEstimate
  /** Pre-flight issues that would cause RA to reject the framework (empty = passes local checks). */
  issues: PublishValidationIssue[]
}

/**
 * Runs publish/preview work as durable background jobs instead of holding an
 * HTTP request open. Callers submit (get a job id back immediately) and poll for
 * status. The Registry Assistant call happens here, server-side, where only the
 * (long) RA client timeout applies — no browser/proxy request ceiling.
 */
export class PublishJobRunner {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: PublishJobStore,
    private readonly previewUseCase: PreviewPublishToRegistry,
    private readonly publishUseCase: PublishFrameworkToRegistry,
    private readonly defaultEnvironment: RegistryEnvironment = 'sandbox',
    /** Injectable for tests; defaults to Date.now via wall clock. */
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Competency count + duration estimate + pre-flight issues, without starting a job. */
  async estimate (cmd: { tenantId: TenantId, caseVersion: CaseVersion, docId: SourcedId }): Promise<PublishEstimateResult> {
    const pkg = await this.loadPackage(cmd)
    const competencyCount = pkg.items.length
    const samples = await this.store.recentSamples()
    return { competencyCount, estimate: estimateDuration(competencyCount, samples), issues: this.preflight(pkg) }
  }

  /** Create a queued job, kick off the background run, and return the job immediately. */
  async submit (cmd: SubmitPublishJobCommand): Promise<PublishJob> {
    const environment = cmd.environment ?? this.defaultEnvironment
    const pkg = await this.loadPackage(cmd)
    const competencyCount = pkg.items.length

    // Fail fast on known-fatal issues instead of spending minutes on an RA round-trip
    // that will only be rejected.
    const issues = this.preflight(pkg)
    if (issues.length) {
      throw new Error(`This framework isn't ready to publish: ${issues.map((i) => i.message).join(' ')}`)
    }

    const samples = await this.store.recentSamples()
    const { estimateMs } = estimateDuration(competencyCount, samples)

    const job: PublishJob = {
      id: randomUUID(),
      tenantId: cmd.tenantId,
      caseVersion: cmd.caseVersion,
      docId: cmd.docId,
      kind: cmd.kind,
      environment,
      status: 'queued',
      competencyCount,
      estimateMs,
      createdAt: new Date(this.now()).toISOString(),
    }
    await this.store.create(job)

    // Fire-and-forget: the run updates the job as it progresses. The extra
    // .catch is a safety net so a bug here can never become an unhandled rejection.
    void this.run(job).catch((err) => {
      logger.error({ jobId: job.id, err: err?.message ?? String(err) }, 'Publish job crashed unexpectedly')
    })

    return job
  }

  /** Current job state, with `elapsedMs` filled in live while running. */
  async get (id: string): Promise<PublishJob | null> {
    const job = await this.store.get(id)
    if (!job) return null
    if (job.status === 'running' && job.startedAt) {
      return { ...job, elapsedMs: this.now() - Date.parse(job.startedAt) }
    }
    return job
  }

  private async run (job: PublishJob): Promise<void> {
    const startedAtMs = this.now()
    await this.store.update(job.id, { status: 'running', startedAt: new Date(startedAtMs).toISOString() })
    logger.info({ jobId: job.id, kind: job.kind, docId: job.docId, environment: job.environment, competencyCount: job.competencyCount }, 'Publish job started')

    try {
      const result = job.kind === 'publish'
        ? await this.publishUseCase.execute({ tenantId: job.tenantId, caseVersion: job.caseVersion, docId: job.docId, environment: job.environment })
        : await this.previewUseCase.execute({ tenantId: job.tenantId, caseVersion: job.caseVersion, docId: job.docId, environment: job.environment })

      const elapsedMs = this.now() - startedAtMs
      await this.store.update(job.id, { status: 'succeeded', result, finishedAt: new Date(this.now()).toISOString(), elapsedMs })
      if (job.competencyCount && job.competencyCount > 0) {
        await this.store.recordSample({ competencyCount: job.competencyCount, elapsedMs, at: new Date(this.now()).toISOString() })
      }
      logger.info({ jobId: job.id, elapsedMs }, 'Publish job succeeded')
    } catch (err: any) {
      const elapsedMs = this.now() - startedAtMs
      await this.store.update(job.id, { status: 'failed', error: err?.message ?? String(err), finishedAt: new Date(this.now()).toISOString(), elapsedMs })
      logger.error({ jobId: job.id, elapsedMs, err: err?.message ?? String(err) }, 'Publish job failed')
    }
  }

  private async loadPackage (cmd: { tenantId: TenantId, caseVersion: CaseVersion, docId: SourcedId }): Promise<CFPackage> {
    const pkg = await this.pkgRepo.load(cmd.tenantId, cmd.caseVersion, cmd.docId)
    if (!pkg) throw new Error(`Framework ${cmd.docId} not found`)
    return pkg
  }

  private preflight (pkg: CFPackage): PublishValidationIssue[] {
    return validatePublishInputs({
      CFDocument: pkg.document.toJSON() as Record<string, any>,
      CFItems: pkg.items.map((i) => i.toJSON() as Record<string, any>),
    })
  }
}
