import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FileCgeCredentialsStore } from '../FileCgeCredentialsStore'

describe('FileCgeCredentialsStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cge-creds-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('refuses to store without encryption key', async () => {
    const store = new FileCgeCredentialsStore(dir, undefined)
    await expect(store.put('t1', {
      clientId: 'cid',
      clientSecret: 'sec',
      apiBaseUrl: 'https://cge.example',
      tokenUrl: 'https://cge.example/token'
    })).rejects.toThrow(/CGE_CREDENTIALS_ENCRYPTION_KEY/)
  })

  it('stores and retrieves encrypted credentials with endpoints', async () => {
    const store = new FileCgeCredentialsStore(dir, 'test-encryption-key-32chars!!')
    const pub = await store.put('demo', {
      clientId: 'my-client-id',
      clientSecret: 'super-secret',
      apiBaseUrl: 'https://cge.example/',
      tokenUrl: 'https://cge.example/oauth/token'
    })
    expect(pub.configured).toBe(true)
    expect(pub.clientIdMasked).toContain('…')
    expect(pub.apiBaseUrl).toBe('https://cge.example')
    expect(pub.tokenUrl).toBe('https://cge.example/oauth/token')

    const creds = await store.get('demo')
    expect(creds?.clientId).toBe('my-client-id')
    expect(creds?.clientSecret).toBe('super-secret')
    expect(creds?.apiBaseUrl).toBe('https://cge.example')
    expect(creds?.tokenUrl).toBe('https://cge.example/oauth/token')

    await store.delete('demo')
    expect(await store.get('demo')).toBeNull()
  })

  it('keeps existing secret when clientSecret is omitted on update', async () => {
    const store = new FileCgeCredentialsStore(dir, 'test-encryption-key-32chars!!')
    await store.put('demo', {
      clientId: 'cid',
      clientSecret: 'original-secret',
      apiBaseUrl: 'https://cge.example',
      tokenUrl: 'https://cge.example/token'
    })

    const pub = await store.put('demo', {
      clientId: 'cid',
      clientSecret: '',
      apiBaseUrl: 'https://cge.example/v2',
      tokenUrl: 'https://cge.example/token2'
    })
    expect(pub.apiBaseUrl).toBe('https://cge.example/v2')
    expect(pub.tokenUrl).toBe('https://cge.example/token2')

    const creds = await store.get('demo')
    expect(creds?.clientSecret).toBe('original-secret')
  })
})
