import { buildCFPackageURI, getOpenCaseExtension } from '../packageUri'

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

describe('getOpenCaseExtension', () => {
  it('returns the ext:opencase object when present', () => {
    expect(getOpenCaseExtension({ 'ext:opencase': { a: 1 } })).toEqual({ a: 1 })
  })

  it('returns undefined when missing or not an object', () => {
    expect(getOpenCaseExtension(undefined)).toBeUndefined()
    expect(getOpenCaseExtension({ 'ext:opencase': 'x' })).toBeUndefined()
  })
})
