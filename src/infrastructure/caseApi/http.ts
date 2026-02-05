export type HttpClient = {
  get: (_url: string) => Promise<unknown>
  post: (_url: string, _body: unknown) => Promise<unknown>
  put: (_url: string, _body: unknown) => Promise<unknown>
  delete: (_url: string) => Promise<unknown>
}

export type FetchHttpClientOptions = {
  /**
   * Called per-request so callers can provide a fresh token (and handle silent refresh later).
   * Return null to omit Authorization header.
   */
  getAccessToken?: () => Promise<string | null>
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly body?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

function joinUrl(baseUrl: string, url: string) {
  const b = baseUrl.replace(/\/+$/, '')
  const u = url.startsWith('/') ? url : `/${url}`
  return `${b}${u}`
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return await res.json()
  const text = await res.text()
  return text || null
}

export function createFetchHttpClient(baseUrl: string, options: FetchHttpClientOptions = {}): HttpClient {
  const doRequest = async (method: string, url: string, body?: unknown): Promise<unknown> => {
    const fullUrl = joinUrl(baseUrl, url)
    const token = options.getAccessToken ? await options.getAccessToken() : null

    const headers: Record<string, string> = {
      // Required by OpenCASE to return ext:opencase extensions in responses
      'X-CASE-EDITOR': 'true',
    }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const parsed = await readBody(res)
    if (!res.ok) {
      const msg = `HTTP ${res.status} ${method} ${url}`
      throw new HttpError(msg, res.status, fullUrl, parsed)
    }

    return parsed
  }

  return {
    get: (url) => doRequest('GET', url),
    post: (url, body) => doRequest('POST', url, body),
    put: (url, body) => doRequest('PUT', url, body),
    delete: (url) => doRequest('DELETE', url),
  }
}

