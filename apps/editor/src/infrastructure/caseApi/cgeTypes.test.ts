import { describe, expect, it } from 'vitest'
import { normalizeCgeFrameworkList, normalizeCgeSubscriptionList } from './cgeTypes'

describe('normalizeCgeFrameworkList', () => {
  it('reads coalition list responses wrapped in data', () => {
    const result = normalizeCgeFrameworkList({
      data: [
        {
          id: '4d669795-c669-46a0-9527-50b360911230',
          frameworkId: '094a6795-78f7-454b-8d68-32b97a88b0cf',
          title: 'Skills-First Roles',
          providerName: '1EdTech',
          sourceUri: 'https://example.com/pkg',
          version: null,
        },
      ],
      pagination: { page: 1, limit: 30, total: 1, totalPages: 1 },
    })

    expect(result).toEqual([
      {
        frameworkId: '094a6795-78f7-454b-8d68-32b97a88b0cf',
        registryId: '4d669795-c669-46a0-9527-50b360911230',
        title: 'Skills-First Roles',
        publisher: '1EdTech',
        version: undefined,
        sourceUri: 'https://example.com/pkg',
        subscribed: false,
        description: undefined,
      },
    ])
  })

  it('supports legacy frameworks array shape', () => {
    const result = normalizeCgeFrameworkList({
      frameworks: [{ frameworkId: 'fw-1', title: 'Legacy', publisher: 'Org' }],
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.frameworkId).toBe('fw-1')
  })
})

describe('normalizeCgeSubscriptionList', () => {
  it('reads subscriptions wrapped in data', () => {
    const result = normalizeCgeSubscriptionList({
      data: [{ frameworkId: 'fw-1', status: 'active' }],
    })
    expect(result).toEqual([{ frameworkId: 'fw-1', status: 'active', subscribedAt: undefined }])
  })
})
