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
      discoveryUrl: 'https://cge.example/realm/.well-known/openid-configuration',
      apiBaseUrl: 'https://cge.example',
      tokenUrl: 'https://cge.example/token'
    })).rejects.toThrow(/CGE_CREDENTIALS_ENCRYPTION_KEY/)
  })

  it('stores and retrieves encrypted credentials with discovery URL', async () => {
    const store = new FileCgeCredentialsStore(dir, 'test-encryption-key-32chars!!')
    const pub = await store.put('demo', {
      clientId: 'my-client-id',
      clientSecret: 'super-secret',
      discoveryUrl: 'https://cge.example/realm/.well-known/openid-configuration',
      apiBaseUrl: 'https://cge.example/',
      tokenUrl: 'https://cge.example/oauth/token'
    })
    expect(pub.configured).toBe(true)
    expect(pub.clientIdMasked).toContain('…')
    expect(pub.discoveryUrl).toBe('https://cge.example/realm/.well-known/openid-configuration')
    expect('apiBaseUrl' in pub).toBe(false)

    const creds = await store.get('demo')
    expect(creds?.clientId).toBe('my-client-id')
    expect(creds?.clientSecret).toBe('super-secret')
    expect(creds?.discoveryUrl).toBe('https://cge.example/realm/.well-known/openid-configuration')
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
      discoveryUrl: 'https://cge.example/realm/.well-known/openid-configuration',
      apiBaseUrl: 'https://cge.example',
      tokenUrl: 'https://cge.example/token'
    })

    const pub = await store.put('demo', {
      clientId: 'cid',
      clientSecret: '',
      discoveryUrl: 'https://cge.example/realm2/.well-known/openid-configuration',
      apiBaseUrl: 'https://cge.example',
      tokenUrl: 'https://cge.example/token2'
    })
    expect(pub.discoveryUrl).toBe('https://cge.example/realm2/.well-known/openid-configuration')

    const creds = await store.get('demo')
    expect(creds?.clientSecret).toBe('original-secret')
  })
})
