import {
  buildFrameworkListQuery,
  extractCoalitionDataList,
  extractCoalitionPagination,
  matchFrameworkEntry,
  resolvePublisherUriFromCoalition
} from '../cgeCoalitionHelpers'

describe('cgeCoalitionHelpers', () => {
  describe('buildFrameworkListQuery', () => {
    it('maps q to search', () => {
      expect(buildFrameworkListQuery({ q: 'math', limit: '20' })).toEqual({
        search: 'math',
        limit: '20'
      })
    })

    it('maps offset to page', () => {
      expect(buildFrameworkListQuery({ offset: '20', limit: '10' })).toEqual({
        page: '3',
        limit: '10'
      })
    })
  })

  describe('extractCoalitionDataList', () => {
    it('reads data array from coalition list response', () => {
      const rows = extractCoalitionDataList({
        data: [{ frameworkId: 'fw-1' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      })
      expect(rows).toHaveLength(1)
    })
  })

  describe('matchFrameworkEntry', () => {
    const rows = [
      { id: 'registry-1', frameworkId: 'fw-abc', title: 'A' },
      { id: 'registry-2', frameworkId: 'fw-def', title: 'B' }
    ]

    it('matches by frameworkId', () => {
      expect(matchFrameworkEntry(rows, 'fw-abc')?.title).toBe('A')
    })

    it('matches by registry id', () => {
      expect(matchFrameworkEntry(rows, 'missing', 'registry-2')?.title).toBe('B')
    })
  })

  describe('extractCoalitionPagination', () => {
    it('reads pagination block', () => {
      expect(extractCoalitionPagination({ pagination: { page: 2, totalPages: 5 } })).toEqual({
        page: 2,
        totalPages: 5
      })
    })
  })

  describe('resolvePublisherUriFromCoalition', () => {
    it('prefers explicit sourceUri', () => {
      expect(resolvePublisherUriFromCoalition(
        { sourceUri: 'https://list.example/pkg' },
        { sourceUri: 'https://detail.example/pkg' },
        'https://explicit.example/pkg'
      )).toBe('https://explicit.example/pkg')
    })

    it('uses detail metadata when present', () => {
      expect(resolvePublisherUriFromCoalition(
        { sourceUri: 'https://list.example/pkg' },
        { metadata: { CFPackageURI: 'https://detail.example/pkg' } }
      )).toBe('https://detail.example/pkg')
    })
  })
})
