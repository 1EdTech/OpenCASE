import type { CFAssociation } from '@/domain/case/types'

/** A framework referenced from an alignment framework's `ext:opencase` extension. */
export type AlignmentFrameworkRef = { identifier?: string; uri: string }

/** The `ext:opencase` fields of an alignment framework's CFDocument. */
export type AlignmentFrameworkExtensions = {
  /** The framework whose associations this alignment framework holds — its owner. */
  alignmentSource?: AlignmentFrameworkRef
  alignmentParticipants?: AlignmentFrameworkRef[]
}

/**
 * The framework that owns an alignment framework: the one its associations
 * originate from. Alignment frameworks saved before `alignmentSource` existed
 * always listed the source as their first participant.
 */
export function alignmentFrameworkSourceId(ext: AlignmentFrameworkExtensions | undefined): string | undefined {
  return ext?.alignmentSource?.identifier ?? ext?.alignmentParticipants?.[0]?.identifier
}

/**
 * The framework an alignment framework's associations point into: the
 * participant other than the source, or the source itself for a self
 * (intra-framework) alignment.
 */
export function alignmentFrameworkTargetId(ext: AlignmentFrameworkExtensions | undefined): string | undefined {
  const sourceId = alignmentFrameworkSourceId(ext)
  if (!sourceId) return undefined
  const other = ext?.alignmentParticipants?.find((p) => p.identifier && p.identifier !== sourceId)
  return other?.identifier ?? sourceId
}

/** An alignment framework's package, as saved: no items, only the source framework's associations. */
export type AlignmentFrameworkPackage = {
  CFDocument: {
    identifier: string
    uri: string
    title: string
    creator: string
    frameworkType: 'Alignment'
    lastChangeDateTime: string
    extensions: { 'ext:opencase': AlignmentFrameworkExtensions }
  }
  CFItems: []
  CFAssociations: CFAssociation[]
}

type FrameworkRef = { identifier: string; title: string }

const documentUri = (identifier: string) => `/ims/case/v1p1/CFDocuments/${identifier}`
const itemUri = (identifier: string) => `/ims/case/v1p1/CFItems/${identifier}`

/** The alignment framework owned by `source` that holds its associations into `target`. */
export function buildAlignmentFrameworkPackage(params: {
  identifier: string
  source: FrameworkRef
  target: FrameworkRef
  creator: string
  associations: CFAssociation[]
  now: string
}): AlignmentFrameworkPackage {
  const { identifier, source, target, creator, associations, now } = params
  const sourceRef = { identifier: source.identifier, uri: documentUri(source.identifier) }
  return {
    CFDocument: {
      identifier,
      uri: documentUri(identifier),
      title: source.identifier === target.identifier
        ? `Internal Alignment: ${source.title}`
        : `Alignment: ${source.title} → ${target.title}`,
      creator,
      frameworkType: 'Alignment',
      lastChangeDateTime: now,
      extensions: {
        'ext:opencase': {
          alignmentSource: sourceRef,
          alignmentParticipants: [sourceRef, { identifier: target.identifier, uri: documentUri(target.identifier) }],
        },
      },
    },
    CFItems: [],
    CFAssociations: associations,
  }
}

/**
 * `existing` plus each of `added` not already among them. `CFDocumentURI` is
 * dropped from the added ones: it names the package they came from.
 */
export function mergeAssociations(existing: CFAssociation[], added: CFAssociation[]): CFAssociation[] {
  const ids = new Set(existing.map((a) => a.identifier))
  const fresh = added
    .filter((a) => !ids.has(a.identifier))
    .map(({ CFDocumentURI: _from, ...a }) => a)
  return fresh.length > 0 ? [...existing, ...fresh] : existing
}

/**
 * An alignment framework updated for its source framework's fork, which gave
 * the source document and its items new identifiers (`forkedIdentifiers`,
 * old → new). Undefined when nothing in it refers to them.
 */
export function remapAlignmentFramework<P extends { CFDocument: { extensions?: Record<string, unknown> }; CFAssociations?: CFAssociation[] }>(
  pkg: P,
  forkedIdentifiers: Record<string, string>,
): P | undefined {
  let changed = false
  const remapFramework = (ref: AlignmentFrameworkRef): AlignmentFrameworkRef => {
    const newId = ref.identifier ? forkedIdentifiers[ref.identifier] : undefined
    if (!newId) return ref
    changed = true
    return { identifier: newId, uri: documentUri(newId) }
  }
  const remapNode = (ref: CFAssociation['originNodeURI']): CFAssociation['originNodeURI'] => {
    const newId = ref.identifier ? forkedIdentifiers[ref.identifier] : undefined
    if (!newId) return ref
    changed = true
    return { ...ref, identifier: newId, uri: /\/CFDocuments\//.test(ref.uri) ? documentUri(newId) : itemUri(newId) }
  }

  const ext = pkg.CFDocument.extensions?.['ext:opencase'] as AlignmentFrameworkExtensions | undefined
  const remappedExt: AlignmentFrameworkExtensions = {
    ...ext,
    ...(ext?.alignmentSource ? { alignmentSource: remapFramework(ext.alignmentSource) } : {}),
    ...(ext?.alignmentParticipants ? { alignmentParticipants: ext.alignmentParticipants.map(remapFramework) } : {}),
  }
  const associations = pkg.CFAssociations?.map((a) => ({
    ...a,
    originNodeURI: remapNode(a.originNodeURI),
    destinationNodeURI: remapNode(a.destinationNodeURI),
  }))

  if (!changed) return undefined
  return {
    ...pkg,
    CFDocument: { ...pkg.CFDocument, extensions: { ...pkg.CFDocument.extensions, 'ext:opencase': remappedExt } },
    ...(associations ? { CFAssociations: associations } : {}),
  }
}
