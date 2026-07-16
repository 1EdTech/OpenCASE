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
    await expect(store.put('t1', 'cid', 'sec')).rejects.toThrow(/CGE_CREDENTIALS_ENCRYPTION_KEY/)
  })

  it('stores and retrieves encrypted credentials', async () => {
    const store = new FileCgeCredentialsStore(dir, 'test-encryption-key-32chars!!')
    const pub = await store.put('demo', 'my-client-id', 'super-secret')
    expect(pub.configured).toBe(true)
    expect(pub.clientIdMasked).toContain('…')

    const creds = await store.get('demo')
    expect(creds?.clientId).toBe('my-client-id')
    expect(creds?.clientSecret).toBe('super-secret')

    await store.delete('demo')
    expect(await store.get('demo')).toBeNull()
  })
})
