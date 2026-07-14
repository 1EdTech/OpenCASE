import { logger } from '../logging/Logger'
import { normalizeCfPackageData, type CFPackageResponse } from '../../application/case/cfPackageShape'

export interface CaseApiClientConfig {
  timeout?: number
  headers?: Record<string, string>
}

export class CaseApiClient {
  constructor (private readonly config: CaseApiClientConfig = {}) {}

  /**
   * Fetches a CFPackage from a CASE API endpoint
   * @param url The full URL to the CFPackage endpoint (e.g., https://example.com/ims/case/v1p1/CFPackages/doc-123)
   * @param accessToken Optional Bearer token for authentication
   * @returns The CFPackage response
   * @throws Error if the request fails or response is invalid
   */
  async fetchCFPackage (url: string, accessToken?: string): Promise<CFPackageResponse> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.config.headers
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, this.config.timeout ?? 30000)

    try {
      logger.info({ url }, 'Fetching CFPackage from endpoint')

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Failed to fetch CFPackage: ${response.status} ${response.statusText}. ${errorText}`
        )
      }

      const data = await response.json()

      // Handle both CASE v1.0 (flat structure) and v1.1 (nested under CFPackage)
      const cfPackage = normalizeCfPackageData(data)

      logger.info({ url, docId: cfPackage.CFDocument.sourcedId || cfPackage.CFDocument.identifier }, 'Successfully fetched CFPackage')

      return { CFPackage: cfPackage }
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout ?? 30000}ms`)
      }
      logger.error({ url, error: error.message }, 'Failed to fetch CFPackage')
      throw error
    }
  }

  /**
   * Fetches a list of CFDocuments from a CASE API endpoint
   * @param url The URL to the CFDocuments endpoint (e.g., https://example.com/ims/case/v1p1/CFDocuments)
   * @param accessToken Optional Bearer token for authentication
   * @returns Array of CFDocument summaries
   */
  async fetchCFDocuments (url: string, accessToken?: string): Promise<any[]> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.config.headers
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, this.config.timeout ?? 30000)

    try {
      logger.info({ url }, 'Fetching CFDocuments from endpoint')

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `Failed to fetch CFDocuments: ${response.status} ${response.statusText}. ${errorText}`
        )
      }

      const data = await response.json()

      // CASE API returns either an array or an object with CFDocuments array
      const documents = Array.isArray(data) ? data : (data.CFDocuments ?? [])

      logger.info({ url, count: documents.length }, 'Successfully fetched CFDocuments')

      return documents
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout ?? 30000}ms`)
      }
      logger.error({ url, error: error.message }, 'Failed to fetch CFDocuments')
      throw error
    }
  }
}
