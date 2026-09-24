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

describe('frameworkToCfPackage — public access', () => {
  it('writes public access into ext:opencase only when enabled', () => {
    const pub = frameworkToCfPackage({
      framework: { ...makeFramework(), metadata: { title: 'Test Framework', publicAccess: true } },
      caseVersion: '1.1',
    })
    const pubExt = pub.CFDocument.extensions?.['ext:opencase'] as { publicAccess?: boolean } | undefined
    expect(pubExt?.publicAccess).toBe(true)
    expect(pub.CFDocument.publicAccess).toBeUndefined()

    const priv = frameworkToCfPackage({
      framework: {
        ...makeFramework(),
        metadata: {
          title: 'Test Framework',
          licenseURI: {
            identifier: 'c0c0c0c0-0000-4000-a000-000000000001',
            uri: '/ims/case/v1p1/CFLicenses/c0c0c0c0-0000-4000-a000-000000000001',
            title: 'Public Domain (CC0 1.0)',
          },
        },
      },
      caseVersion: '1.1',
    })
    const privExt = priv.CFDocument.extensions?.['ext:opencase'] as { publicAccess?: boolean } | undefined
    expect(privExt?.publicAccess).toBeUndefined()
  })
})
