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
  /**
   * Per-request timeout in ms. Backstop only: kept above OpenCASE's own Registry
   * Assistant timeout (default 240s) so the server returns a clean 504 first, but
   * below the browser's ~5 min network ceiling so a hung request still surfaces a
   * readable error instead of an opaque browser failure. Default 270000 (4.5 min).
   */
  timeoutMs?: number
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
  const timeoutMs = options.timeoutMs ?? 270000
  const doRequest = async (method: string, url: string, body?: unknown): Promise<unknown> => {
    const fullUrl = joinUrl(baseUrl, url)
    const token = options.getAccessToken ? await options.getAccessToken() : null

    const headers: Record<string, string> = {
      // Required by OpenCASE to return OpenCASE extensions in responses
      'X-CASE-EDITOR': 'true',
    }
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => { controller.abort() }, timeoutMs)
    let res: Response
    try {
      res = await fetch(fullUrl, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (err) {
      if (controller.signal.aborted) {
        throw new HttpError(
          `Request timed out after ${timeoutMs}ms — ${method} ${url}. Large frameworks can take several minutes; try again or contact an administrator if it persists.`,
          504,
          fullUrl,
        )
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }

    const parsed = await readBody(res)
    if (!res.ok) {
      // Surface the server's error detail ({ error, message }) so callers/UI see the
      // real cause instead of a bare status code.
      const detail = parsed && typeof parsed === 'object'
        ? ((parsed as { message?: string; error?: string }).message ?? (parsed as { error?: string }).error)
        : typeof parsed === 'string' && parsed ? parsed : undefined
      const msg = `HTTP ${res.status} ${method} ${url}${detail ? ` — ${detail}` : ''}`
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

