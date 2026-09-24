/** Coalition framework summary from CGE search/list APIs. */
export type CgeFrameworkSummary = {
  /** CASE framework identifier (CFDocument id / coalition frameworkId). */
  frameworkId: string
  /** Coalition registry entry UUID (GET /frameworks/{id}). */
  registryId?: string
  title: string
  publisher?: string
  version?: string
  sourceUri?: string
  subscribed?: boolean
  description?: string
}

export type CgeSubscriptionSummary = {
  frameworkId: string
  status?: string
  subscribedAt?: string
}

export type CgeImportResult = {
  status: string
  id: string
  docId: string
  version?: number
  cgeFrameworkId?: string
  title?: string
  sourceUri?: string
  itemCount?: number
  cachedAt?: string
  readOnly?: boolean
  fromCache?: boolean
}

export type CachedFrameworkItemSummary = {
  identifier: string
  uri?: string
  fullStatement?: string
  abbreviatedStatement?: string
  humanCodingScheme?: string
  CFItemType?: string
}

function optionalText (value: unknown): string | undefined {
  if (value == null) return undefined
  return typeof value === 'string' ? value : String(value)
}

function firstText (...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value != null) return optionalText(value)
  }
  return undefined
}

/** Extract an array from heterogeneous CGE list responses. */
function extractCgeListArray (data: unknown, keys: string[]): unknown[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  for (const key of keys) {
    const value = obj[key]
    if (Array.isArray(value)) return value
  }
  return []
}

/** Normalize heterogeneous CGE API responses into framework summaries. */
export function normalizeCgeFrameworkList (data: unknown): CgeFrameworkSummary[] {
  const raw = extractCgeListArray(data, ['data', 'frameworks', 'items', 'results'])

  return raw.map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      frameworkId: String(row.frameworkId ?? row.identifier ?? ''),
      registryId: row.id ? String(row.id) : undefined,
      title: String(row.title ?? row.name ?? 'Untitled framework'),
      publisher: firstText(row.publisher, row.providerName, row.organization, row.creator),
      version: optionalText(row.version),
      sourceUri: firstText(row.sourceUri, row.source_uri, row.uri, row.packageUri),
      subscribed: row.subscribed === true || row.isSubscribed === true || row.subscriptionStatus === 'active',
      description: optionalText(row.description),
    }
  }).filter(f => f.frameworkId)
}

export function normalizeCgeSubscriptionList (data: unknown): CgeSubscriptionSummary[] {
  const raw = extractCgeListArray(data, ['data', 'subscriptions'])

  return raw.map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      frameworkId: String(row.frameworkId ?? row.id ?? ''),
      status: optionalText(row.status),
      subscribedAt: firstText(row.subscribedAt, row.createdAt),
    }
  }).filter(s => s.frameworkId)
}
