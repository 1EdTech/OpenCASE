/**
 * Helpers for durable publish identity. When a framework is published to the
 * Credential Registry, OpenCASE persists the minted CTIDs (framework + each
 * competency) and the per-environment registry envelope id under
 * `ext:opencase.published`, so a re-publish reuses the same CTIDs and updates the
 * existing registry envelope instead of creating duplicates.
 */
import { generateCtid } from './ctid'

const OPENCASE = 'ext:opencase'
export type RegistryEnvironment = 'sandbox' | 'production'

type Json = Record<string, any>

function opencaseExt(node: Json | undefined): Json {
  const ext = node?.extensions?.[OPENCASE]
  return ext && typeof ext === 'object' ? ext : {}
}

function idOf(node: Json): string {
  return (node.identifier ?? node.sourcedId ?? '') as string
}

export interface PublishCtids {
  frameworkCtid: string
  ctidFor: (_localId: string) => string
}

/** Assign CTIDs for a publish, reusing any already persisted on the nodes. */
export function buildPublishCtids(pkg: { CFDocument: Json; CFItems?: Json[] }): PublishCtids {
  const map = new Map<string, string>()
  const docId = idOf(pkg.CFDocument)
  const frameworkCtid = (opencaseExt(pkg.CFDocument).published?.ctid as string | undefined) ?? generateCtid()
  if (docId) map.set(docId, frameworkCtid)
  for (const item of pkg.CFItems ?? []) {
    const id = idOf(item)
    if (!id) continue
    map.set(id, (opencaseExt(item).published?.ctid as string | undefined) ?? generateCtid())
  }
  const ctidFor = (localId: string): string => {
    let c = map.get(localId)
    if (!c) { c = generateCtid(); map.set(localId, c) }
    return c
  }
  return { frameworkCtid, ctidFor }
}

/** Registry envelope id previously recorded for this environment (undefined = first publish here). */
export function envelopeIdFor(pkg: { CFDocument: Json }, environment: RegistryEnvironment): string | undefined {
  const env = opencaseExt(pkg.CFDocument).published?.byEnvironment?.[environment]
  return typeof env?.registryEnvelopeId === 'string' ? env.registryEnvelopeId : undefined
}

/** Merge publish results back into the package JSON: CTIDs on every node, envelope per environment on the document. */
export function applyPublishResult(
  pkg: { CFDocument: Json; CFItems?: Json[] },
  args: { ctidFor: (_id: string) => string; environment: RegistryEnvironment; registryEnvelopeId?: string; publishedAt: string },
): { CFDocument: Json; CFItems: Json[] } {
  const withOpencase = (node: Json, mutate: (_ext: Json) => void): Json => {
    const extensions = { ...(node.extensions ?? {}) }
    const ext = { ...(extensions[OPENCASE] && typeof extensions[OPENCASE] === 'object' ? extensions[OPENCASE] : {}) }
    mutate(ext)
    extensions[OPENCASE] = ext
    return { ...node, extensions }
  }

  const CFDocument = withOpencase(pkg.CFDocument, (ext) => {
    const prev = ext.published && typeof ext.published === 'object' ? ext.published : {}
    ext.published = {
      ...prev,
      ctid: args.ctidFor(idOf(pkg.CFDocument)),
      byEnvironment: {
        ...(prev.byEnvironment ?? {}),
        [args.environment]: { registryEnvelopeId: args.registryEnvelopeId, publishedAt: args.publishedAt },
      },
    }
  })

  const CFItems = (pkg.CFItems ?? []).map((item) =>
    withOpencase(item, (ext) => {
      const prev = ext.published && typeof ext.published === 'object' ? ext.published : {}
      ext.published = { ...prev, ctid: args.ctidFor(idOf(item)) }
    }),
  )

  return { CFDocument, CFItems }
}

/**
 * Preserve durable publish identity across saves. The editor doesn't round-trip the
 * server-written `ext:opencase.published` block, so a plain save would drop the minted
 * CTIDs + envelope ids and the next publish would create a duplicate. This copies the
 * prior version's `published` block onto the incoming save wherever the incoming lacks
 * one — the document, and each item matched by identifier. Incoming values always win,
 * so an explicit republish/clear still takes effect; newly added items (no prior match)
 * are left untouched so publish mints fresh CTIDs for them.
 */
export function carryForwardPublishState(
  incoming: { CFDocument: Json; CFItems?: Json[] },
  prior: { CFDocument: Json; CFItems?: Json[] } | null | undefined,
): { CFDocument: Json; CFItems?: Json[] } {
  if (!prior) return incoming

  const withPublished = (node: Json, published: Json): Json => {
    const extensions = { ...(node.extensions ?? {}) }
    const ext = { ...(extensions[OPENCASE] && typeof extensions[OPENCASE] === 'object' ? extensions[OPENCASE] : {}) }
    ext.published = published
    extensions[OPENCASE] = ext
    return { ...node, extensions }
  }

  let CFDocument = incoming.CFDocument
  const priorDocPublished = opencaseExt(prior.CFDocument).published
  if (!opencaseExt(CFDocument).published && priorDocPublished) {
    CFDocument = withPublished(CFDocument, priorDocPublished)
  }

  const priorItemPublished = new Map<string, Json>()
  for (const item of prior.CFItems ?? []) {
    const pub = opencaseExt(item).published
    const id = idOf(item)
    if (id && pub) priorItemPublished.set(id, pub)
  }

  const CFItems = (incoming.CFItems ?? []).map((item) => {
    if (opencaseExt(item).published) return item
    const pub = priorItemPublished.get(idOf(item))
    return pub ? withPublished(item, pub) : item
  })

  return { ...incoming, CFDocument, CFItems }
}

/** Pull the registry envelope id out of a Registry Assistant publish response. */
export function extractEnvelopeId(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const b = body as Json
  const v = b.RegistryEnvelopeIdentifier ?? b.RegistryEnvelopeId ?? b.EnvelopeIdentifier ?? b.EnvelopeId
  return typeof v === 'string' && v ? v : undefined
}

/** Public registry resource URL for a published CTID (resources live on the registry host, not the assistant). */
export function registryResourceUrl(environment: RegistryEnvironment, ctid: string): string {
  const base = environment === 'production'
    ? 'https://credentialengineregistry.org'
    : 'https://sandbox.credentialengineregistry.org'
  return `${base}/resources/${ctid}`
}
