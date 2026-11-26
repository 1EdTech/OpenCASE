import { CgeApiClient } from '../CgeApiClient'

const ENDPOINT = 'https://publisher.example/ims/case/v1p1/CFPackages/fw-1'
const PACKAGE = { CFDocument: { identifier: 'fw-1' }, CFItems: [] }

type Call = { url: string, authorization?: string }

function makeClient () {
  let tokenCount = 0
  const auth = {
    getAccessToken: jest.fn(async () => `tok-${++tokenCount}`),
    refreshAccessToken: jest.fn(async () => `tok-${++tokenCount}`)
  }
  const credentialsStore = {
    get: jest.fn(async () => ({
      clientId: 'cid',
      clientSecret: 'sec',
      discoveryUrl: 'https://cge.example/.well-known/openid-configuration',
      apiBaseUrl: 'https://cge.example',
      tokenUrl: 'https://cge.example/token',
      updatedAt: '2026-01-01T00:00:00Z'
    }))
  }
  return new CgeApiClient(auth as any, credentialsStore as any)
}

/** Mocks fetch so each request gets the status `respond` picks; records the calls. */
function mockPublisher (respond: (call: Call) => number): Call[] {
  const calls: Call[] = []
  global.fetch = jest.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
    const call = { url, authorization: init?.headers?.Authorization }
    calls.push(call)
    const status = respond(call)
    return {
      ok: status < 400,
      status,
      json: async () => PACKAGE,
      text: async () => `status ${status}`
    } as any
  }) as any
  return calls
}

describe('CgeApiClient.fetchPublisherPackage', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('sends the CGE token and makes no other request when the publisher accepts it', async () => {
    const calls = mockPublisher(() => 200)
    await expect(makeClient().fetchPublisherPackage('t1', ENDPOINT)).resolves.toEqual(PACKAGE)
    expect(calls.map((c) => c.authorization)).toEqual(['Bearer tok-1'])
  })

  it('retries without a token when an open publisher rejects the token (403)', async () => {
    const calls = mockPublisher((c) => (c.authorization ? 403 : 200))
    await expect(makeClient().fetchPublisherPackage('t1', ENDPOINT)).resolves.toEqual(PACKAGE)
    expect(calls.map((c) => c.authorization)).toEqual(['Bearer tok-1', undefined])
  })

  it('tries a fresh token on 401 before retrying without one', async () => {
    const calls = mockPublisher((c) => (c.authorization ? 401 : 200))
    await expect(makeClient().fetchPublisherPackage('t1', ENDPOINT)).resolves.toEqual(PACKAGE)
    expect(calls.map((c) => c.authorization)).toEqual(['Bearer tok-1', 'Bearer tok-2', undefined])
  })

  it('throws the error from the request with the token when the retry without one also fails', async () => {
    mockPublisher((c) => (c.authorization ? 403 : 404))
    await expect(makeClient().fetchPublisherPackage('t1', ENDPOINT)).rejects.toMatchObject({ status: 403 })
  })

  it('does not retry without a token for other failures', async () => {
    const calls = mockPublisher(() => 500)
    await expect(makeClient().fetchPublisherPackage('t1', ENDPOINT)).rejects.toMatchObject({ status: 500 })
    expect(calls).toHaveLength(1)
  })

  it('names the publisher address and the network cause when no response comes back', async () => {
    global.fetch = jest.fn(async () => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } })
    }) as any
    await expect(makeClient().fetchPublisherPackage('t1', ENDPOINT))
      .rejects.toThrow(`Could not reach the publisher at ${ENDPOINT}: ENOTFOUND`)
  })
})
