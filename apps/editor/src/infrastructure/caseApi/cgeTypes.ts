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

  return raw.map((item: any) => ({
    frameworkId: String(item.frameworkId ?? item.identifier ?? ''),
    registryId: item.id ? String(item.id) : undefined,
    title: String(item.title ?? item.name ?? 'Untitled framework'),
    publisher: item.publisher ?? item.providerName ?? item.organization ?? item.creator,
    version: item.version ?? undefined,
    sourceUri: item.sourceUri ?? item.source_uri ?? item.uri ?? item.packageUri,
    subscribed: item.subscribed === true || item.isSubscribed === true || item.subscriptionStatus === 'active',
    description: item.description
  })).filter(f => f.frameworkId)
}

export function normalizeCgeSubscriptionList (data: unknown): CgeSubscriptionSummary[] {
  const raw = extractCgeListArray(data, ['data', 'subscriptions'])

  return raw.map((item: any) => ({
    frameworkId: String(item.frameworkId ?? item.id ?? ''),
    status: item.status,
    subscribedAt: item.subscribedAt ?? item.createdAt
  })).filter(s => s.frameworkId)
}
