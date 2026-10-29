import type { Request, Response } from 'express'
import { applyQueryToArray, setPaginationHeaders, stripExtensions, stripOpenCaseExtensions } from '../httpUtils'

describe('stripOpenCaseExtensions', () => {
  it('removes only ext:opencase and keeps other extensions on every entity in a package', () => {
    const pkg = {
      CFDocument: {
        identifier: 'doc-1',
        extensions: { 'ext:opencase': { layout: {} }, sourceSystem: 'smartschool' }
      },
      CFItems: [
        { identifier: 'item-1', extensions: { 'ext:opencase': { colorBand: 'red' }, smartschoolId: 'ss-1' } },
        { identifier: 'item-2', extensions: { smartschoolId: 'ss-2' } }
      ],
      CFAssociations: [
        { identifier: 'assoc-1', extensions: { 'ext:opencase': { originHandle: 'top' }, minimumGoal: 'MG-7' } }
      ]
    }

    expect(stripOpenCaseExtensions(pkg)).toEqual({
      CFDocument: { identifier: 'doc-1', extensions: { sourceSystem: 'smartschool' } },
      CFItems: [
        { identifier: 'item-1', extensions: { smartschoolId: 'ss-1' } },
        { identifier: 'item-2', extensions: { smartschoolId: 'ss-2' } }
      ],
      CFAssociations: [
        { identifier: 'assoc-1', extensions: { minimumGoal: 'MG-7' } }
      ]
    })
  })

  it('drops the extensions property when only ext:opencase was present', () => {
    const result = stripOpenCaseExtensions({ identifier: 'item-1', extensions: { 'ext:opencase': { colorBand: 'red' } } })
    expect(result).toEqual({ identifier: 'item-1' })
  })

  it('does not walk into extension values', () => {
    const nested = { extensions: { 'ext:opencase': 'third-party data that happens to reuse the key' } }
    const result = stripOpenCaseExtensions({ extensions: { vendor: nested } })
    expect(result).toEqual({ extensions: { vendor: nested } })
  })

  it('does not mutate the input', () => {
    const input = { extensions: { 'ext:opencase': { a: 1 }, custom: 2 } }
    stripOpenCaseExtensions(input)
    expect(input).toEqual({ extensions: { 'ext:opencase': { a: 1 }, custom: 2 } })
  })

  it('returns primitives and null unchanged', () => {
    expect(stripOpenCaseExtensions(null)).toBeNull()
    expect(stripOpenCaseExtensions('x')).toBe('x')
  })
})

describe('stripExtensions', () => {
  it('removes every extensions property (CASE v1.0 has no extensions field)', () => {
    const pkg = {
      CFDocument: { identifier: 'doc-1', extensions: { sourceSystem: 'smartschool' } },
      CFItems: [{ identifier: 'item-1', extensions: { 'ext:opencase': {}, smartschoolId: 'ss-1' } }]
    }
    expect(stripExtensions(pkg)).toEqual({
      CFDocument: { identifier: 'doc-1' },
      CFItems: [{ identifier: 'item-1' }]
    })
  })
})

describe('setPaginationHeaders', () => {
  const makeReq = (originalUrl: string) => ({
    originalUrl,
    protocol: 'https',
    get: () => 'case.example.org',
    header: () => undefined
  }) as unknown as Request

  const run = (originalUrl: string, total: number, q: { limit?: number, offset?: number }) => {
    const headers: Record<string, string> = {}
    const res = { setHeader: (k: string, v: string) => { headers[k] = v } } as unknown as Response
    setPaginationHeaders(makeReq(originalUrl), res, total, q)
    return headers
  }

  const links = (header: string) => Object.fromEntries(
    header.split(', ').map(l => {
      const [, url, rel] = /^<([^>]+)>; rel="(\w+)"$/.exec(l)!
      return [rel, new URL(url).searchParams.get('offset')]
    })
  )

  it('sets only X-Total-Count when the request is not paginated', () => {
    expect(run('/ims/case/v1p1/CFDocuments', 7, {})).toEqual({ 'X-Total-Count': '7' })
  })

  it('returns first/prev/next/last links that preserve the other query parameters', () => {
    const headers = run('/ims/case/v1p1/CFDocuments?limit=10&offset=20&sort=title', 53, { limit: 10, offset: 20 })
    expect(headers['X-Total-Count']).toBe('53')
    expect(headers.Link.split(', ')[0]).toBe('<https://case.example.org/ims/case/v1p1/CFDocuments?limit=10&offset=0&sort=title>; rel="first"')
    expect(links(headers.Link)).toEqual({ first: '0', prev: '10', next: '30', last: '50' })
  })

  it('omits prev on the first page and next on the last page', () => {
    expect(links(run('/x?limit=10', 25, { limit: 10 }).Link)).toEqual({ first: '0', next: '10', last: '20' })
    expect(links(run('/x?limit=10&offset=20', 25, { limit: 10, offset: 20 }).Link)).toEqual({ first: '0', prev: '10', last: '20' })
  })

  it('keeps last on the same page grid as next when paging from a non-aligned offset', () => {
    expect(links(run('/x?limit=4&offset=1', 25, { limit: 4, offset: 1 }).Link)).toEqual({ first: '0', prev: '0', next: '5', last: '21' })
  })

  it('clamps prev to zero and handles an empty collection', () => {
    expect(links(run('/x?limit=10&offset=3', 0, { limit: 10, offset: 3 }).Link)).toEqual({ first: '0', prev: '0', last: '0' })
  })

  it('returns only a first link when offset is given without a limit', () => {
    expect(links(run('/x?offset=5', 9, { offset: 5 }).Link)).toEqual({ first: '0' })
  })
})

describe('applyQueryToArray', () => {
  it('reports the filtered total before the page is cut', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ identifier: `id-${i}`, tag: i % 2 === 0 ? 'even' : 'odd' }))
    const applied = applyQueryToArray(items, { filter: 'even', limit: 2, offset: 1 })
    expect(applied.ok && applied.total).toBe(4)
    expect(applied.ok && applied.items.map(i => i.identifier)).toEqual(['id-2', 'id-4'])
  })
})
