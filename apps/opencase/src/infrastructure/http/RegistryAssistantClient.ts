import { logger } from '../logging/Logger'

export type RegistryEnvironment = 'sandbox' | 'production'

export interface RegistryAssistantConfig {
  environment?: RegistryEnvironment
  sandboxBaseUrl?: string
  productionBaseUrl?: string
  apiKey?: string
  timeout?: number
}

export interface RegistryAssistantResult {
  ok: boolean
  status: number
  /** Parsed response body (RA returns { Successful, Messages, CTID, Payload, ... }). */
  body: unknown
}

/**
 * Thin client for the Credential Engine **Registry Assistant** competency-framework
 * endpoints. `format` is a dry-run that validates + returns the CTDL the registry
 * would store (publishes nothing); `publish` writes to the registry.
 *
 * Auth is per-organization: header `Authorization: ApiToken <apiKey>`.
 * https://credreg.net/registry/assistant
 */
export class RegistryAssistantClient {
  private static readonly DEFAULT_SANDBOX = 'https://sandbox.credentialengine.org'
  private static readonly DEFAULT_PRODUCTION = 'https://apps.credentialengine.org'

  private readonly environment: RegistryEnvironment
  private readonly sandboxBaseUrl: string
  private readonly productionBaseUrl: string
  private readonly apiKey?: string
  private readonly timeout: number

  constructor (config: RegistryAssistantConfig = {}) {
    this.environment = config.environment ?? 'sandbox'
    this.sandboxBaseUrl = (config.sandboxBaseUrl ?? RegistryAssistantClient.DEFAULT_SANDBOX).replace(/\/+$/, '')
    this.productionBaseUrl = (config.productionBaseUrl ?? RegistryAssistantClient.DEFAULT_PRODUCTION).replace(/\/+$/, '')
    this.apiKey = config.apiKey
    this.timeout = config.timeout ?? 60000
  }

  hasApiKey (): boolean { return Boolean(this.apiKey) }

  private baseUrlFor (env: RegistryEnvironment): string {
    return env === 'production' ? this.productionBaseUrl : this.sandboxBaseUrl
  }

  /** Dry-run: validate + format without publishing. */
  async format (request: unknown, environment?: RegistryEnvironment): Promise<RegistryAssistantResult> {
    return this.send('format', 'POST', request, environment)
  }

  /** Publish (writes to the registry). */
  async publish (request: unknown, environment?: RegistryEnvironment): Promise<RegistryAssistantResult> {
    return this.send('publish', 'POST', request, environment)
  }

  /**
   * Delete a published resource by CTID. Registry data is meant to be permanent, so CE
   * recommends deprecating over deleting for production; this is primarily for sandbox
   * cleanup. Body: { CTID, PublishForOrganizationIdentifier }.
   */
  async delete (request: { CTID: string, PublishForOrganizationIdentifier: string, Registry?: string }, environment?: RegistryEnvironment): Promise<RegistryAssistantResult> {
    return this.send('delete', 'DELETE', request, environment)
  }

  private async send (action: 'format' | 'publish' | 'delete', method: 'POST' | 'DELETE', request: unknown, environment?: RegistryEnvironment): Promise<RegistryAssistantResult> {
    if (!this.apiKey) {
      throw new Error('Registry Assistant API key is not configured (REGISTRY_ASSISTANT_API_KEY)')
    }
    const env = environment ?? this.environment
    const url = `${this.baseUrlFor(env)}/assistant/competencyframework/${action}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => { controller.abort() }, this.timeout)
    try {
      logger.info({ url, environment: env, action }, 'Registry Assistant request')
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `ApiToken ${this.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const text = await response.text()
      let body: unknown = text
      try { body = text ? JSON.parse(text) : null } catch { /* leave as text */ }

      // RA returns 200 with { Successful: false, Messages: [...] } for validation failures.
      const successful = (body && typeof body === 'object' && 'Successful' in (body as any))
        ? Boolean((body as any).Successful)
        : response.ok
      logger.info({ url, status: response.status, successful, action }, 'Registry Assistant response')
      return { ok: response.ok && successful, status: response.status, body }
    } catch (error: any) {
      clearTimeout(timeoutId)
      const timedOut = error?.name === 'AbortError'
      const message = timedOut ? `Registry Assistant request timed out after ${this.timeout}ms` : (error?.message ?? String(error))
      logger.error({ url, environment: env, action, timedOut, error: message }, 'Registry Assistant request failed')
      throw timedOut ? new Error(message) : error
    }
  }
}
