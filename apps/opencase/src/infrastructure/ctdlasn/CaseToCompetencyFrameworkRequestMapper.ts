/**
 * Maps a CASE CFPackage (CFDocument + CFItems + CFAssociations) to a Credential
 * Engine **Registry Assistant** CompetencyFramework publish request. This is the
 * reverse of CtdlAsnToCaseMapper: CASE domain → Registry Assistant input schema.
 *
 * The Registry Assistant accepts a simplified request (not raw CTDL-ASN JSON-LD);
 * it builds the JSON-LD graph itself. Framework + competencies publish together.
 * See https://credreg.net/registry/assistant and the RA CompetencyFrameworkRequest model.
 */

export interface CompetencyFrameworkInput {
  CTID: string
  Name: string
  Description?: string
  InLanguage?: string[]
  Publisher?: string[]        // org CTIDs / URIs
  PublisherName?: string[]    // display names
  Source?: string[]           // ceasn:source — original framework this is derived from
  Identifier?: string[]       // ceasn:identifier — alternative URI(s) identifying this framework
  HasTopChild?: string[]      // CTIDs of top-level competencies
  PublicationStatusType?: string // e.g. 'Published' | 'Deprecated'
}

export interface CompetencyInput {
  CTID: string
  CompetencyText: string
  CompetencyLabel?: string
  CodedNotation?: string
  Comment?: string[]
  IsPartOf?: string           // framework CTID this competency belongs to (all competencies)
  IsTopChildOf?: string       // framework CTID, for top-level competencies
  IsChildOf?: string[]        // parent competency CTIDs (item → item only)
  Identifier?: string[]       // ceasn:identifier — alternative URI(s) identifying this competency
  ExactAlignment?: string[]   // resource URIs (exactMatchOf)
  AlignTo?: string[]          // resource URIs (generic related alignment)
}

export interface CompetencyFrameworkRequestPayload {
  PublishForOrganizationIdentifier: string
  DefaultLanguage: string
  RegistryEnvelopeId?: string
  CompetencyFramework: CompetencyFrameworkInput
  Competencies: CompetencyInput[]
}

export interface CaseCfPackageJson {
  CFDocument: Record<string, any>
  CFItems?: Record<string, any>[]
  CFAssociations?: Record<string, any>[]
}

export interface MapPublishOptions {
  /** CTID of the organization publishing (PublishForOrganizationIdentifier + Publisher). */
  organizationCtid: string
  /** Falls back to the document language, then this, then "en-US". */
  defaultLanguage?: string
  /** Resolve a local CASE identifier to the CTID OpenCASE has assigned it. */
  ctidFor: (localIdentifier: string) => string
  /** Existing registry envelope id, when re-publishing (update). */
  registryEnvelopeId?: string
  /** Registry publication status for the framework (e.g. 'Deprecated' to deprecate on republish). */
  publicationStatusType?: string
  /**
   * Public, resolvable base URL of this OpenCASE instance's CASE API. When set, relative
   * CASE URIs are absolutized against it and preserved as ceasn:identifier. When unset,
   * only already-absolute, resolvable URIs are preserved (localhost/relative are skipped).
   */
  casePublicBaseUrl?: string
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)

/** Read the ext:opencase extension object off a CASE node (document or item). */
function opencaseExt (node: Record<string, any> | undefined): Record<string, any> {
  const ext = node?.extensions?.['ext:opencase']
  return ext && typeof ext === 'object' ? ext : {}
}

/**
 * Return a resolvable, absolute http(s) URI for preservation as ceasn:identifier/source,
 * or undefined. Relative CASE paths ("/ims/case/…") are absolutized against `base` when
 * provided; non-http schemes (urn:), and non-resolvable hosts (localhost, *.local) are
 * dropped so we never publish a dead identifier.
 */
function resolvableUri (raw: unknown, base?: string): string | undefined {
  const s = str(raw)
  if (!s) return undefined
  let u = s
  if (u.startsWith('/') && base) u = base.replace(/\/+$/, '') + u
  if (!/^https?:\/\//i.test(u)) return undefined
  try {
    const host = new URL(u).hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return undefined
    return u
  } catch {
    return undefined
  }
}

/** Filter falsy, dedupe, preserve order. */
function uniqStrings (values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))))
}

/** CASE association type → the Registry Assistant Competency alignment property it maps to. */
function alignmentPropertyFor (associationType: string | undefined): 'ExactAlignment' | 'AlignTo' | null {
  switch (associationType) {
    case 'exactMatchOf': return 'ExactAlignment'
    case 'isRelatedTo': return 'AlignTo'
    default: return null // isChildOf/isPartOf are structural; others unmapped for now
  }
}

export function mapCaseToCompetencyFrameworkRequest (
  pkg: CaseCfPackageJson,
  opts: MapPublishOptions,
): CompetencyFrameworkRequestPayload {
  const doc = pkg.CFDocument ?? {}
  const items = pkg.CFItems ?? []
  const associations = pkg.CFAssociations ?? []

  const docId: string = str(doc.identifier) ?? str(doc.sourcedId) ?? ''
  const language = str(doc.language) ?? opts.defaultLanguage ?? 'en-US'
  const itemIds = new Set(items.map((i) => str(i.identifier) ?? str(i.sourcedId) ?? '').filter(Boolean))

  // Structural (isChildOf) relationships and cross-framework alignments.
  const childOfItemParents = new Map<string, Set<string>>() // childId -> parent item ids
  const topLevelIds = new Set<string>()
  const alignmentsByOrigin = new Map<string, { exact: Set<string>; related: Set<string> }>()

  const ensureAlign = (id: string) => {
    let a = alignmentsByOrigin.get(id)
    if (!a) { a = { exact: new Set(), related: new Set() }; alignmentsByOrigin.set(id, a) }
    return a
  }

  for (const a of associations) {
    const type = str(a.associationType)
    const originId = str(a.originNodeURI?.identifier)
    const destId = str(a.destinationNodeURI?.identifier)
    const destUri = str(a.destinationNodeURI?.uri)
    if (!originId) continue

    if (type === 'isChildOf' || type === 'isPartOf') {
      if (destId === docId) {
        topLevelIds.add(originId) // child of the framework itself → top-level competency
      } else if (destId && itemIds.has(destId)) {
        if (!childOfItemParents.has(originId)) childOfItemParents.set(originId, new Set())
        childOfItemParents.get(originId)!.add(destId)
      }
      continue
    }

    // Cross-framework alignment (destination is an external/registry resource, not a local item)
    const prop = alignmentPropertyFor(type)
    if (prop && destUri && !(destId && itemIds.has(destId))) {
      if (prop === 'ExactAlignment') ensureAlign(originId).exact.add(destUri)
      else ensureAlign(originId).related.add(destUri)
    }
  }

  // Any item that never appears as a child of another item is also top-level.
  for (const id of itemIds) {
    if (!childOfItemParents.has(id)) topLevelIds.add(id)
  }

  const publisherName = str(doc.publisher)
  const frameworkCtid = opts.ctidFor(docId)

  // Preserve provenance: ceasn:source = the framework this was derived from (the upstream
  // registry original for a forked import) plus any official source URL; ceasn:identifier =
  // this framework's own resolvable OpenCASE CASE URI.
  const docExt = opencaseExt(doc)
  const sourceUris = uniqStrings([
    resolvableUri((docExt.derivedFrom as any)?.uri, opts.casePublicBaseUrl),
    resolvableUri(doc.officialSourceURL, opts.casePublicBaseUrl) ?? str(doc.officialSourceURL),
  ])
  const frameworkIdentifier = resolvableUri(doc.uri, opts.casePublicBaseUrl)

  const CompetencyFramework: CompetencyFrameworkInput = {
    CTID: frameworkCtid,
    Name: str(doc.title) ?? 'Untitled Framework',
    Description: str(doc.description),
    InLanguage: [language],
    Publisher: [opts.organizationCtid],
    ...(publisherName ? { PublisherName: [publisherName] } : {}),
    ...(sourceUris.length ? { Source: sourceUris } : {}),
    ...(frameworkIdentifier ? { Identifier: [frameworkIdentifier] } : {}),
    ...(opts.publicationStatusType ? { PublicationStatusType: opts.publicationStatusType } : {}),
    HasTopChild: Array.from(topLevelIds).map(opts.ctidFor),
  }

  const Competencies: CompetencyInput[] = items.map((item) => {
    const id = str(item.identifier) ?? str(item.sourcedId) ?? ''
    const parents = childOfItemParents.get(id)
    const align = alignmentsByOrigin.get(id)
    const notes = str(item.notes)
    const isTopLevel = topLevelIds.has(id)
    // ceasn:identifier — this competency's own resolvable OpenCASE CASE URI.
    const identifierUri = resolvableUri(item.uri, opts.casePublicBaseUrl)
    return {
      CTID: opts.ctidFor(id),
      CompetencyText: str(item.fullStatement) ?? '',
      ...(str(item.alternativeLabel) ?? str(item.abbreviatedStatement)
        ? { CompetencyLabel: str(item.alternativeLabel) ?? str(item.abbreviatedStatement) }
        : {}),
      ...(str(item.humanCodingScheme) ? { CodedNotation: str(item.humanCodingScheme) } : {}),
      ...(identifierUri ? { Identifier: [identifierUri] } : {}),
      ...(notes ? { Comment: [notes] } : {}),
      // Every competency declares membership in the framework; top-level ones also
      // declare IsTopChildOf. Registry Assistant requires this relationship.
      IsPartOf: frameworkCtid,
      ...(isTopLevel ? { IsTopChildOf: frameworkCtid } : {}),
      ...(parents && parents.size ? { IsChildOf: Array.from(parents).map(opts.ctidFor) } : {}),
      ...(align && align.exact.size ? { ExactAlignment: Array.from(align.exact) } : {}),
      ...(align && align.related.size ? { AlignTo: Array.from(align.related) } : {}),
    }
  })

  return {
    PublishForOrganizationIdentifier: opts.organizationCtid,
    DefaultLanguage: language,
    ...(opts.registryEnvelopeId ? { RegistryEnvelopeId: opts.registryEnvelopeId } : {}),
    CompetencyFramework,
    Competencies,
  }
}
