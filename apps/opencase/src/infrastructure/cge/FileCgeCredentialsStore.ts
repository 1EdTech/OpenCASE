import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

export interface CgeCredentials {
  clientId: string
  clientSecret: string
  /** CASE Global coalition API base URL (e.g. https://cge.example.com). */
  apiBaseUrl: string
  /** OAuth2 token endpoint for client_credentials. */
  tokenUrl: string
  updatedAt: string
}

export interface CgeCredentialsPublic {
  configured: boolean
  clientIdMasked: string | null
  apiBaseUrl: string | null
  tokenUrl: string | null
  updatedAt: string | null
}

export interface CgeCredentialsInput {
  clientId: string
  /** When empty and credentials already exist, the previous secret is retained. */
  clientSecret?: string
  apiBaseUrl: string
  tokenUrl: string
}

/**
 * File-based per-tenant CGE credential + endpoint store.
 * Secrets are encrypted at rest when an encryption key is configured.
 */
export class FileCgeCredentialsStore {
  constructor (
    private readonly baseDataDir: string,
    private readonly encryptionKey: string | undefined
  ) {}

  private credentialsPath (tenantId: string): string {
    return join(this.baseDataDir, 'tenants', tenantId, 'cge', 'credentials.json')
  }

  private deriveKey (): Buffer {
    if (!this.encryptionKey) {
      throw new Error('CGE_CREDENTIALS_ENCRYPTION_KEY is required to store CGE credentials')
    }
    // scrypt with fixed salt scoped to this app purpose
    return scryptSync(this.encryptionKey, 'opencase-cge-credentials', 32)
  }

  private encrypt (plaintext: string): string {
    const key = this.deriveKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
  }

  private decrypt (payload: string): string {
    if (!payload.startsWith('v1:')) {
      // Legacy/dev plaintext fallback when key was not used
      return payload
    }
    const parts = payload.split(':')
    if (parts.length !== 4) throw new Error('Invalid encrypted credential payload')
    const [, ivB64, tagB64, dataB64] = parts
    const key = this.deriveKey()
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final()
    ]).toString('utf8')
  }

  private maskClientId (id: string): string {
    return id.length <= 8 ? '********' : `${id.slice(0, 4)}…${id.slice(-4)}`
  }

  async get (tenantId: string): Promise<CgeCredentials | null> {
    const path = this.credentialsPath(tenantId)
    if (!existsSync(path)) return null
    const raw = JSON.parse(await readFile(path, 'utf8')) as {
      clientId: string
      clientSecret: string
      apiBaseUrl?: string
      tokenUrl?: string
      updatedAt: string
    }
    return {
      clientId: raw.clientId,
      clientSecret: this.decrypt(raw.clientSecret),
      apiBaseUrl: (raw.apiBaseUrl ?? '').trim(),
      tokenUrl: (raw.tokenUrl ?? '').trim(),
      updatedAt: raw.updatedAt
    }
  }

  async getPublic (tenantId: string): Promise<CgeCredentialsPublic> {
    const creds = await this.get(tenantId)
    if (!creds) {
      return {
        configured: false,
        clientIdMasked: null,
        apiBaseUrl: null,
        tokenUrl: null,
        updatedAt: null
      }
    }
    return {
      configured: true,
      clientIdMasked: this.maskClientId(creds.clientId),
      apiBaseUrl: creds.apiBaseUrl || null,
      tokenUrl: creds.tokenUrl || null,
      updatedAt: creds.updatedAt
    }
  }

  async put (tenantId: string, input: CgeCredentialsInput): Promise<CgeCredentialsPublic> {
    if (!this.encryptionKey) {
      throw new Error('CGE_CREDENTIALS_ENCRYPTION_KEY is required to store CGE credentials')
    }

    const apiBaseUrl = input.apiBaseUrl.trim().replace(/\/$/, '')
    const tokenUrl = input.tokenUrl.trim()
    const clientId = input.clientId.trim()
    if (!apiBaseUrl) throw new Error('apiBaseUrl is required')
    if (!tokenUrl) throw new Error('tokenUrl is required')
    if (!clientId) throw new Error('clientId is required')

    const existing = await this.get(tenantId)
    const secretInput = (input.clientSecret ?? '').trim()
    const clientSecret = secretInput || existing?.clientSecret
    if (!clientSecret) {
      throw new Error('clientSecret is required')
    }

    const path = this.credentialsPath(tenantId)
    await mkdir(dirname(path), { recursive: true })
    const updatedAt = new Date().toISOString()
    const payload = {
      clientId,
      clientSecret: this.encrypt(clientSecret),
      apiBaseUrl,
      tokenUrl,
      updatedAt
    }
    await writeFile(path, JSON.stringify(payload, null, 2), 'utf8')
    return await this.getPublic(tenantId)
  }

  async delete (tenantId: string): Promise<void> {
    const path = this.credentialsPath(tenantId)
    if (existsSync(path)) {
      await unlink(path)
    }
  }
}
