/** Coalition framework list query — maps legacy `q`/`offset` to CGE `search`/`page`. */
export function buildFrameworkListQuery (query?: Record<string, string>): Record<string, string> {
  if (!query) return {}
  const out: Record<string, string> = { ...query }

  if (out.q && !out.search) {
    out.search = out.q
    delete out.q
  }

  if (out.offset && !out.page) {
    const limit = Number.parseInt(out.limit ?? '20', 10)
    const offset = Number.parseInt(out.offset, 10)
    if (Number.isFinite(limit) && limit > 0 && Number.isFinite(offset) && offset >= 0) {
      out.page = String(Math.floor(offset / limit) + 1)
    }
    delete out.offset
  }

  return out
}

/** Extract framework rows from coalition list/detail responses. */
export function extractCoalitionDataList (data: unknown): any[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data !== 'object') return []

  const obj = data as Record<string, unknown>
  for (const key of ['data', 'frameworks', 'items', 'results']) {
    const value = obj[key]
    if (Array.isArray(value)) return value
  }
  return []
}

/** Read coalition pagination metadata when present. */
export function extractCoalitionPagination (data: unknown): { page: number, totalPages: number } | null {
  if (!data || typeof data !== 'object') return null
  const pagination = (data as Record<string, unknown>).pagination
  if (!pagination || typeof pagination !== 'object') return null
  const page = Number((pagination as Record<string, unknown>).page)
  const totalPages = Number((pagination as Record<string, unknown>).totalPages)
  if (!Number.isFinite(page) || !Number.isFinite(totalPages) || totalPages < 1) return null
  return { page, totalPages }
}

/** Match a coalition list row by CASE frameworkId or registry entry id. */
export function matchFrameworkEntry (entries: any[], frameworkId: string, registryId?: string): any | null {
  const needle = frameworkId.trim()
  const registryNeedle = registryId?.trim()
  if (!needle && !registryNeedle) return null

  return entries.find((entry) =>
    (needle && String(entry?.frameworkId ?? '') === needle) ||
    (needle && String(entry?.id ?? '') === needle) ||
    (registryNeedle && String(entry?.id ?? '') === registryNeedle)
  ) ?? null
}

/** Resolve publisher CFPackage URL from coalition list/detail payloads. */
export function resolvePublisherUriFromCoalition (
  entry: any,
  detail?: any,
  explicitSourceUri?: string
): string {
  const explicit = (explicitSourceUri ?? '').trim()
  if (explicit) return explicit

  const meta = detail?.metadata
  const metaUri = typeof meta === 'object' && meta
    ? (meta.CFPackageURI ?? meta.uri ?? meta.officialSourceURL)
    : undefined

  return String(
    detail?.sourceUri ??
    metaUri ??
    entry?.sourceUri ??
    detail?.source_uri ??
    entry?.source_uri ??
    detail?.uri ??
    entry?.uri ??
    detail?.packageUri ??
    entry?.packageUri ??
    ''
  ).trim()
}

export function resolveCoalitionFrameworkTitle (entry: any, detail?: any, cfPackage?: any): string {
  return String(
    detail?.title ??
    entry?.title ??
    detail?.name ??
    entry?.name ??
    cfPackage?.CFDocument?.title ??
    cfPackage?.CFPackage?.CFDocument?.title ??
    'Remote framework'
  )
}
