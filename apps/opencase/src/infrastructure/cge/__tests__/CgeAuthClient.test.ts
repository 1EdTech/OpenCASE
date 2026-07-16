import { CgeAuthClient } from '../CgeAuthClient'

describe('CgeAuthClient', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('mints and caches access tokens', async () => {
    let calls = 0
    global.fetch = jest.fn(async () => {
      calls += 1
      return {
        ok: true,
        json: async () => ({ access_token: 'tok-1', expires_in: 3600 })
      } as any
    }) as any

    const client = new CgeAuthClient('https://cge.example/token')
    const t1 = await client.getAccessToken('cid', 'sec')
    const t2 = await client.getAccessToken('cid', 'sec')
    expect(t1).toBe('tok-1')
    expect(t2).toBe('tok-1')
    expect(calls).toBe(1)
  })

  it('refreshAccessToken bypasses cache', async () => {
    let calls = 0
    global.fetch = jest.fn(async () => {
      calls += 1
      return {
        ok: true,
        json: async () => ({ access_token: `tok-${calls}`, expires_in: 3600 })
      } as any
    }) as any

    const client = new CgeAuthClient('https://cge.example/token')
    await client.getAccessToken('cid', 'sec')
    const refreshed = await client.refreshAccessToken('cid', 'sec')
    expect(refreshed).toBe('tok-2')
    expect(calls).toBe(2)
  })
})
