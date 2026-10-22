import type { CFDocument, CFItem, CFPackage } from '@/domain/case/types'
import type { CasePackageSnapshot } from './CasePackageSnapshot'

const nowIso = () => new Date().toISOString()

export function caseSnapshotToCfDocument(snapshot: CasePackageSnapshot): CFDocument {
  const d = snapshot.document
  const id = d.identifier
  return {
    identifier: id,
    uri: d.uri ?? `urn:case:document:${id}`,
    creator: d.creator ?? 'OpenCASE',
    title: d.title ?? 'Untitled',
    description: d.description,
    frameworkType: d.frameworkType,
    adoptionStatus: d.adoptionStatus,
    caseVersion: d.caseVersion ?? (snapshot.version === 'unknown' ? undefined : snapshot.version),
    lastChangeDateTime: d.lastChangeDateTime ?? nowIso(),
    CFPackageURI: { uri: `urn:case:package:${id}` },
  }
}

export function caseSnapshotToCfItems(snapshot: CasePackageSnapshot): CFItem[] {
  return snapshot.items.map((it) => ({
    identifier: it.identifier,
    uri: it.uri ?? `urn:case:item:${it.identifier}`,
    fullStatement: it.fullStatement,
    abbreviatedStatement: it.abbreviatedStatement,
    alternativeLabel: it.alternativeLabel,
    humanCodingScheme: it.humanCodingScheme,
    CFItemType: it.CFItemType,
    subject: it.subject,
    educationLevel: it.educationLevel,
    conceptKeywords: it.conceptKeywords,
    notes: it.notes,
    lastChangeDateTime: it.lastChangeDateTime ?? nowIso(),
    extensions: it.extensions,
  }))
}

/**
 * Helper for legacy UI paths that still expect a CASE v1.1-ish `CFPackage`.
 * This *does not* attempt to be a perfect serializer; it's just enough to hydrate the editor.
 */
export function caseSnapshotToCfPackage(snapshot: CasePackageSnapshot): CFPackage {
  return {
    CFDocument: caseSnapshotToCfDocument(snapshot),
    CFItems: caseSnapshotToCfItems(snapshot),
    // NOTE: UI graph builder reads `originNodeURI.identifier` / `destinationNodeURI.identifier`.
    CFAssociations: snapshot.associations.map((a) => ({
      identifier: a.identifier,
      associationType: a.associationType ?? 'isChildOf',
      uri: `urn:case:association:${a.identifier}`,
      originNodeURI: { uri: a.originUri ?? `urn:case:item:${a.originIdentifier ?? ''}`, identifier: a.originIdentifier ?? '', title: a.originTitle, targetType: a.originTargetType },
      destinationNodeURI: { uri: a.destinationUri ?? `urn:case:item:${a.destinationIdentifier ?? ''}`, identifier: a.destinationIdentifier ?? '', title: a.destinationTitle, targetType: a.destinationTargetType },
      lastChangeDateTime: a.lastChangeDateTime ?? nowIso(),
      extensions: a.extensions,
    })),
  }
}

