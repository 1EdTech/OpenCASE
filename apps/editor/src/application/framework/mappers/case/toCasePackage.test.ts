import { describe, it, expect } from 'vitest'
import { frameworkToCfPackage } from './toCasePackage'
import type { Framework } from '@/domain/framework/model/types'
import type { FrameworkId } from '@/domain/shared/types'

function makeFramework(version?: string): Framework {
  return {
    id: 'fw-test' as FrameworkId,
    metadata: { title: 'Test Framework', version },
    items: new Map(),
    associations: new Map(),
  }
}

describe('frameworkToCfPackage — version', () => {
  it('passes through an author-assigned version unchanged', () => {
    const cfPackage = frameworkToCfPackage({ framework: makeFramework('1.4'), caseVersion: '1.1' })
    expect(cfPackage.CFDocument.version).toBe('1.4')
  })

  it('does not invent a default version when none is set', () => {
    const cfPackage = frameworkToCfPackage({ framework: makeFramework(undefined), caseVersion: '1.1' })
    expect(cfPackage.CFDocument.version).toBeUndefined()
  })

  it('leaves version untouched across repeated saves (no auto-increment)', () => {
    const framework = makeFramework('2.0')
    const first = frameworkToCfPackage({ framework, caseVersion: '1.1' })
    const second = frameworkToCfPackage({ framework, caseVersion: '1.1' })
    expect(first.CFDocument.version).toBe('2.0')
    expect(second.CFDocument.version).toBe('2.0')
  })
})
