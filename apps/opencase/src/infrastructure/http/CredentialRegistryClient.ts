import { logger } from '../logging/Logger'

export interface CtdlGraph {
  '@context': string | Record<string, string>
  '@graph': Record<string, any>[]
}

export class CredentialRegistryClient {
  private static readonly DEFAULT_BASE_URL = 'https://credentialengineregistry.org'
  private readonly baseUrl: string
  private readonly timeout: number

  constructor (config: { baseUrl?: string; timeout?: number } = {}) {
    // Normalize away any trailing slash so `${base}/graph/...` is well-formed.
    this.baseUrl = (config.baseUrl ?? CredentialRegistryClient.DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.timeout = config.timeout ?? 30000
  }

  async fetchGraph (ctidOrUrl: string): Promise<CtdlGraph> {
    const ctid = CredentialRegistryClient.extractCtid(ctidOrUrl)
    // A full resource URL identifies its own registry (origin); a bare CTID uses the
    // configured default. This is what lets a single deployment import from prod,
    // sandbox, or a self-hosted CTDL registry without reconfiguration.
    const base = CredentialRegistryClient.resolveBase(ctidOrUrl) ?? this.baseUrl
    const url = `${base}/graph/${ctid}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => { controller.abort() }, this.timeout)

    try {
      logger.info({ url }, 'Fetching Credential Registry graph')

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Credential Registry fetch failed: ${response.status} ${response.statusText}. ${text}`
        )
      }

      const data = await response.json() as CtdlGraph

      if (!Array.isArray(data['@graph'])) {
        throw new Error('Invalid Credential Registry response: missing @graph array')
      }

      logger.info({ url, nodeCount: data['@graph'].length }, 'Successfully fetched Credential Registry graph')
      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`)
      }
      logger.error({ url, error: error.message }, 'Failed to fetch Credential Registry graph')
      throw error
    }
  }

  /** Returns the origin (scheme://host[:port]) when the input is a full http(s) URL, else undefined. */
  static resolveBase (ctidOrUrl: string): string | undefined {
    try {
      const u = new URL(ctidOrUrl)
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin
    } catch { /* not a URL — fall through */ }
    return undefined
  }

  static extractCtid (ctidOrUrl: string): string {
    // Match bare CTIDs (ce-{uuid}) or extract from registry URLs
    const match = ctidOrUrl.match(/\bce-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i)
    if (match) return match[0]
    throw new Error(
      `Could not extract a valid CTID from: "${ctidOrUrl}". ` +
      'Expected a Credential Engine CTID (e.g. ce-abf4a1d5-...) or a registry URL containing one.'
    )
  }
}
