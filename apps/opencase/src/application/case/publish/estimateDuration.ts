import type { PublishThroughputSample } from './PublishJob'

export interface DurationEstimate {
  /** Estimated total duration in ms. */
  estimateMs: number
  /** `measured` = derived from recorded runs; `default` = no/too-few samples, using a built-in rate. */
  basis: 'measured' | 'default'
  /** How many recorded samples informed the estimate. */
  sampleCount: number
}

/**
 * Fallback throughput when we have no measured history yet. Calibrated from live
 * Registry Assistant sandbox runs (2026-08-18): a valid /format measured ~2.2s per
 * competency plus ~25s fixed overhead across 25–809 competencies (809 → ~30 min,
 * matching this constant). Real recorded samples refine it after a few runs.
 */
const DEFAULT_MS_PER_COMPETENCY = 2200
/** Fixed overhead (request/response, framework-level work) added regardless of size. */
const BASE_OVERHEAD_MS = 25000
/** Need at least this many samples before trusting measured throughput over the default. */
const MIN_SAMPLES_FOR_MEASURED = 3

function median (values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Estimate how long a publish of `competencyCount` competencies will take, using
 * the median per-competency rate from recorded samples when enough exist, else a
 * conservative default. Only samples with a positive competency count contribute.
 */
export function estimateDuration (competencyCount: number, samples: PublishThroughputSample[]): DurationEstimate {
  const usable = samples.filter((s) => s.competencyCount > 0 && s.elapsedMs > 0)

  if (usable.length >= MIN_SAMPLES_FOR_MEASURED) {
    const perCompetency = median(usable.map((s) => s.elapsedMs / s.competencyCount))
    return {
      estimateMs: Math.round(BASE_OVERHEAD_MS + perCompetency * competencyCount),
      basis: 'measured',
      sampleCount: usable.length,
    }
  }

  return {
    estimateMs: Math.round(BASE_OVERHEAD_MS + DEFAULT_MS_PER_COMPETENCY * competencyCount),
    basis: 'default',
    sampleCount: usable.length,
  }
}
