import { buildCFPackageURI, deriveSourcePackageURI, getOpenCaseExtension } from '../packageUri'

describe('buildCFPackageURI (CGE-59)', () => {
  const source = 'https://standards.example.org/ims/case/v1p1/CFPackages/doc-1'

  it('points a pristine mirror imported by URL at its source', () => {
    expect(buildCFPackageURI('doc-1', '1.1', { isModifiedFromSource: false, sourcePackageURI: source }))
      .toEqual({ title: 'CFPackage', identifier: 'doc-1', uri: source })
  })

  it('points a forked framework at this server', () => {
    expect(buildCFPackageURI('doc-2', '1.1', { isModifiedFromSource: true, sourcePackageURI: source }).uri)
      .toBe('/ims/case/v1p1/CFPackages/doc-2')
  })

  it('points a mirror pasted as JSON (no known source) at this server', () => {
    expect(buildCFPackageURI('doc-1', '1.1', { isModifiedFromSource: false }).uri)
      .toBe('/ims/case/v1p1/CFPackages/doc-1')
  })

  it('points a locally authored framework at this server, using the requested CASE version', () => {
    expect(buildCFPackageURI('doc-1', '1.0', undefined).uri).toBe('/ims/case/v1p0/CFPackages/doc-1')
  })
})

describe('deriveSourcePackageURI (CGE-45)', () => {
  it('uses the CFPackageURI the publisher declared on the CFDocument', () => {
    expect(deriveSourcePackageURI({
      uri: 'https://a.example.org/ims/case/v1p1/CFDocuments/doc-1',
      CFPackageURI: { uri: 'https://b.example.org/ims/case/v1p1/CFPackages/doc-1' }
    })).toBe('https://b.example.org/ims/case/v1p1/CFPackages/doc-1')
  })

  it('derives the CFPackages URL from a CASE API CFDocument uri, keeping any path prefix', () => {
    expect(deriveSourcePackageURI({ uri: 'https://case.example.org/ims/case/v1p1/CFDocuments/doc-1' }))
      .toBe('https://case.example.org/ims/case/v1p1/CFPackages/doc-1')
    expect(deriveSourcePackageURI({ uri: 'https://example.org/api/ims/case/v1p0/CFDocuments/doc-1' }))
      .toBe('https://example.org/api/ims/case/v1p0/CFPackages/doc-1')
  })

  it('returns undefined when no source can be determined', () => {
    expect(deriveSourcePackageURI({ uri: '/ims/case/v1p1/CFDocuments/doc-1' })).toBeUndefined()
    expect(deriveSourcePackageURI({ uri: 'https://example.org/uri/doc-1' })).toBeUndefined()
    expect(deriveSourcePackageURI({ uri: 'urn:case:doc-1', CFPackageURI: { uri: 'urn:case:package:doc-1' } })).toBeUndefined()
    expect(deriveSourcePackageURI(undefined)).toBeUndefined()
  })
})

describe('getOpenCaseExtension', () => {
  it('returns the ext:opencase object when present', () => {
    expect(getOpenCaseExtension({ 'ext:opencase': { a: 1 } })).toEqual({ a: 1 })
  })

  it('returns undefined when missing or not an object', () => {
    expect(getOpenCaseExtension(undefined)).toBeUndefined()
    expect(getOpenCaseExtension({ 'ext:opencase': 'x' })).toBeUndefined()
  })
})
