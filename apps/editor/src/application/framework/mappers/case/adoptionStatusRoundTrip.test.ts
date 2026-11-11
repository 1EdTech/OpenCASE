import { describe, it, expect } from 'vitest'
import { frameworkToCfPackage } from './toCasePackage'
import { loadFrameworkFromCfPackage } from '@/application/framework/services/FrameworkLoader'
import type { CFPackage } from '@/domain/case/types'

const DOC_ID = 'doc-1'

function makePackage(adoptionStatus: string): CFPackage {
  return {
    CFDocument: {
      identifier: DOC_ID,
      uri: `/ims/case/v1p1/CFDocuments/${DOC_ID}`,
      title: 'Curriculum',
      creator: 'Importer',
      lastChangeDateTime: '2026-01-01T00:00:00.000Z',
      caseVersion: '1.1',
      adoptionStatus,
    },
    CFItems: [],
    CFAssociations: [],
  } as unknown as CFPackage
}

// CGE-70: legacy CASE 1.0 values must survive load + save unchanged, so a save
// never rewrites a status the author didn't touch.
describe('adoptionStatus round trip', () => {
  it.each(['Adopted', 'Deprecated', 'Implemented', 'Derived'])('keeps %s as stored', (status) => {
    const framework = loadFrameworkFromCfPackage(makePackage(status))
    if (!framework) throw new Error('failed to load framework')
    expect(framework.metadata.adoptionStatus).toBe(status)

    const saved = frameworkToCfPackage({ framework, caseVersion: '1.1' })
    expect(saved.CFDocument.adoptionStatus).toBe(status)
  })
})
