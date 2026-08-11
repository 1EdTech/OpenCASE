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
  Source?: string[]
  HasTopChild?: string[]      // CTIDs of top-level competencies
}

export interface CompetencyInput {
  CTID: string
  CompetencyText: string
  CompetencyLabel?: string
  CodedNotation?: string
  Comment?: string[]
  IsChildOf?: string[]        // parent competency CTIDs (item → item only)
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
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)

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
  const source = str(doc.officialSourceURL)

  const CompetencyFramework: CompetencyFrameworkInput = {
    CTID: opts.ctidFor(docId),
    Name: str(doc.title) ?? 'Untitled Framework',
    Description: str(doc.description),
    InLanguage: [language],
    Publisher: [opts.organizationCtid],
    ...(publisherName ? { PublisherName: [publisherName] } : {}),
    ...(source ? { Source: [source] } : {}),
    HasTopChild: Array.from(topLevelIds).map(opts.ctidFor),
  }

  const Competencies: CompetencyInput[] = items.map((item) => {
    const id = str(item.identifier) ?? str(item.sourcedId) ?? ''
    const parents = childOfItemParents.get(id)
    const align = alignmentsByOrigin.get(id)
    const notes = str(item.notes)
    return {
      CTID: opts.ctidFor(id),
      CompetencyText: str(item.fullStatement) ?? '',
      ...(str(item.alternativeLabel) ?? str(item.abbreviatedStatement)
        ? { CompetencyLabel: str(item.alternativeLabel) ?? str(item.abbreviatedStatement) }
        : {}),
      ...(str(item.humanCodingScheme) ? { CodedNotation: str(item.humanCodingScheme) } : {}),
      ...(notes ? { Comment: [notes] } : {}),
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
