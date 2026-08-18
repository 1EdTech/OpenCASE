import { estimateDuration } from '../estimateDuration'
import type { PublishThroughputSample } from '../PublishJob'

const sample = (competencyCount: number, elapsedMs: number): PublishThroughputSample => ({
  competencyCount, elapsedMs, at: '2026-01-01T00:00:00.000Z',
})

describe('estimateDuration', () => {
  it('uses the calibrated default when there are too few samples', () => {
    const e = estimateDuration(100, [])
    expect(e.basis).toBe('default')
    expect(e.sampleCount).toBe(0)
    // base overhead + 2200ms/competency (from live-sandbox calibration)
    expect(e.estimateMs).toBe(25000 + 2200 * 100)
  })

  it('still defaults with fewer than three usable samples', () => {
    const e = estimateDuration(50, [sample(10, 2000), sample(20, 4000)])
    expect(e.basis).toBe('default')
    expect(e.sampleCount).toBe(2)
  })

  it('switches to measured throughput once enough samples exist', () => {
    // Three runs at a steady 200ms/competency.
    const samples = [sample(10, 2000), sample(20, 4000), sample(30, 6000)]
    const e = estimateDuration(100, samples)
    expect(e.basis).toBe('measured')
    expect(e.sampleCount).toBe(3)
    expect(e.estimateMs).toBe(25000 + 200 * 100)
  })

  it('uses the median rate so one slow outlier does not dominate', () => {
    // rates: 100, 100, 100, and one wild 1000 ms/comp outlier → median stays 100.
    const samples = [sample(10, 1000), sample(10, 1000), sample(10, 1000), sample(10, 10000)]
    const e = estimateDuration(10, samples)
    expect(e.basis).toBe('measured')
    expect(e.estimateMs).toBe(25000 + 100 * 10)
  })

  it('ignores samples with non-positive counts or durations', () => {
    const samples = [sample(0, 5000), sample(10, 0), sample(10, 2000)]
    const e = estimateDuration(10, samples)
    // Only one usable sample → default basis.
    expect(e.basis).toBe('default')
    expect(e.sampleCount).toBe(1)
  })
})
