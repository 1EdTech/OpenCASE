import { randomUUID } from 'node:crypto'
import type { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { LinkDataHelper } from '../../../domain/case/value-objects/LinkData'

export interface RawComparableBundle {
  CFDocument: any
  CFItems?: any[]
  CFAssociations?: any[]
  CFRubrics?: any[]
  CFDefinitions?: any
}

function basePath (caseVersion: CaseVersion): string {
  return caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'
}

/**
 * Deep-clones a comparison bundle and strips fields that are never "framework
 * data" for fork-detection purposes:
 *  - `extensions['ext:opencase']` — OpenCASE's own mirror/fork provenance
 *    (sourcePackageURI/isModifiedFromSource/importedAt), or the frontend's
 *    canvas layout/notes/handles/edge-type/color-band. Never CASE source
 *    content.
 *  - `lastChangeDateTime` — stamped fresh by the frontend on every export
 *    (`frameworkToCfDocument`), so it always differs between two consecutive
 *    saves regardless of whether anything was actually edited.
 *  - `CFPackageURI` (CFDocument) / `CFDocumentURI` (CFItems, CFAssociations)
 *    — GET-only, spec-derived back-references (see
 *    `CreateFramework.preparePayloadForValidation`, which already treats them
 *    as "only present in GET responses but not allowed in POST requests").
 *    The frontend's exporter (`toCasePackage.ts`) always synthesizes a fresh
 *    placeholder `CFPackageURI` on every save rather than preserving a
 *    mirrored document's real (possibly foreign) one, so comparing it raw
 *    would false-positive a fork on literally every save of any mirrored
 *    framework, including a pure layout-only move.
 *  - `CFDefinitions` entirely — it's a "hydrated" convenience mirror of
 *    shared catalog entries (licenses, item types, subjects, concepts,
 *    association groupings) already referenced BY IDENTIFIER on
 *    CFDocument/CFItems/CFAssociations, which are otherwise compared in
 *    full. A genuine edit to which definition an item/document/association
 *    references shows up there (e.g. `CFItems[].CFItemTypeURI.identifier`
 *    changing) regardless of whether CFDefinitions is compared. But the
 *    *rendering* of a shared catalog entry (its uri, title, description) is
 *    tenant-wide state, not this framework's own data, and can legitimately
 *    differ between "as originally imported" (a mirror preserves the
 *    source's raw CFDefinitions blob verbatim forever) and "as currently
 *    reconstructed from the tenant's live catalog" (the frontend always
 *    rebuilds CFDefinitions fresh from editor state on every save) without
 *    anything about the framework itself having changed — e.g. a definition
 *    identifier that collides with one of OpenCASE's own seed defaults
 *    permanently keeps the seed's local uri in the tenant catalog (by
 *    design — see the FileFrameworkStore seed-ownership protection), so it
 *    will never again byte-match the foreign uri a mirror's own
 *    CFDefinitions preserved from its source. Comparing CFDefinitions raw
 *    forked on the very first save of any mirror that referenced such a
 *    definition, regardless of what the user actually edited.
 * No other fields are excluded — remaining reference URIs on
 * CFDocument/CFItems/CFAssociations themselves (licenseURI, CFItemTypeURI,
 * etc.) are stable given the framework id and don't produce false positives.
 */
export function stripNonDataFields (bundle: RawComparableBundle): RawComparableBundle {
  const stripEntity = (entity: any): any => {
    if (!entity || typeof entity !== 'object') return entity
    const { extensions, lastChangeDateTime, CFPackageURI, CFDocumentURI, ...rest } = entity
    if (extensions && typeof extensions === 'object') {
      const { 'ext:opencase': _omit, ...restExtensions } = extensions
      if (Object.keys(restExtensions).length > 0) {
        rest.extensions = restExtensions
      }
    }
    return rest
  }

  return {
    CFDocument: stripEntity(bundle.CFDocument),
    CFItems: (bundle.CFItems ?? []).map(stripEntity),
    CFAssociations: (bundle.CFAssociations ?? []).map(stripEntity),
    CFRubrics: (bundle.CFRubrics ?? []).map(stripEntity),
    CFDefinitions: null
  }
}

/**
 * Mints brand-new local identifiers/URIs for a raw CFPackage payload's
 * document, every item, every association, and every rubric — the fork
 * transition. Returns a new payload ready to be parsed with
 * `{ preserveUris: true }` (it's already fully local and self-consistent, so
 * no further URI rebasing should run against it).
 *
 * Reference URIs (licenseURI, CFItemTypeURI, subjectURI, conceptKeywordsURI,
 * CFAssociationGroupingURI) keep their identifier — they point at shared
 * per-tenant catalog entries, not this framework's own identity, and forking
 * mints no new identifier for them — but their `uri` is rebased onto this
 * instance (via the same `LinkDataHelper.rebaseLinkData` used for ordinary,
 * never-mirrored documents), since the referenced definition was copied into
 * this tenant's local catalog at import time and a fork is meant to be a
 * fully independent local copy, no longer pointing back at the source host.
 *
 * The document's own identifier changes here, but its storage location does
 * not — see FileCFPackageRepository.saveNewVersion's storageKey parameter.
 */
export function mintForkedIdentifiers (
  payload: RawComparableBundle,
  tenantId: TenantId,
  caseVersion: CaseVersion
): RawComparableBundle {
  const base = basePath(caseVersion)
  const cloned: RawComparableBundle = JSON.parse(JSON.stringify(payload))

  // Old identifier (item or document) -> newly-minted identifier.
  const nodeIdMap = new Map<string, string>()

  const oldDocId = (cloned.CFDocument.sourcedId ?? cloned.CFDocument.identifier) as string | undefined
  const newDocId = randomUUID()
  if (oldDocId) nodeIdMap.set(oldDocId, newDocId)

  cloned.CFDocument.sourcedId = newDocId
  cloned.CFDocument.identifier = newDocId
  cloned.CFDocument.uri = `${base}/CFDocuments/${newDocId}`
  const newDocUri = cloned.CFDocument.uri
  const newDocTitle = cloned.CFDocument.title ?? 'Document'

  if (cloned.CFDocument.licenseURI) {
    cloned.CFDocument.licenseURI = LinkDataHelper.rebaseLinkData(cloned.CFDocument.licenseURI, caseVersion, 'CFLicenses')
  }
  if (Array.isArray(cloned.CFDocument.subjectURI)) {
    cloned.CFDocument.subjectURI = cloned.CFDocument.subjectURI.map((s: any) => LinkDataHelper.rebaseLinkData(s, caseVersion, 'CFSubjects'))
  }

  for (const item of cloned.CFItems ?? []) {
    const oldItemId = (item.sourcedId ?? item.identifier) as string | undefined
    const newItemId = randomUUID()
    if (oldItemId) nodeIdMap.set(oldItemId, newItemId)
    item.sourcedId = newItemId
    item.identifier = newItemId
    item.uri = `${base}/CFItems/${newItemId}`
    item.CFDocumentURI = { title: newDocTitle, identifier: newDocId, uri: newDocUri }
    if (item.CFItemTypeURI) {
      item.CFItemTypeURI = LinkDataHelper.rebaseLinkData(item.CFItemTypeURI, caseVersion, 'CFItemTypes')
    }
    if (item.conceptKeywordsURI) {
      item.conceptKeywordsURI = LinkDataHelper.rebaseLinkData(item.conceptKeywordsURI, caseVersion, 'CFConcepts')
    }
    if (item.licenseURI) {
      item.licenseURI = LinkDataHelper.rebaseLinkData(item.licenseURI, caseVersion, 'CFLicenses')
    }
    if (Array.isArray(item.subjectURI)) {
      item.subjectURI = item.subjectURI.map((s: any) => LinkDataHelper.rebaseLinkData(s, caseVersion, 'CFSubjects'))
    }
  }

  const resolveNode = (ref: any, label: string): { title: string, identifier: string, uri: string } => {
    if (oldDocId !== undefined && ref?.identifier === oldDocId) {
      return { title: ref?.title ?? newDocTitle, identifier: newDocId, uri: newDocUri }
    }
    const oldId = ref?.identifier as string | undefined
    const newId = oldId ? nodeIdMap.get(oldId) : undefined
    if (!newId) {
      throw new Error(`Fork failed: ${label} references unknown node '${oldId ?? '(missing)'}'`)
    }
    return { title: ref?.title ?? newId, identifier: newId, uri: `${base}/CFItems/${newId}` }
  }

  for (const assoc of cloned.CFAssociations ?? []) {
    const oldAssocId = (assoc.sourcedId ?? assoc.identifier) as string | undefined
    const newAssocId = randomUUID()
    assoc.sourcedId = newAssocId
    assoc.identifier = newAssocId
    assoc.uri = `${base}/CFAssociations/${newAssocId}`
    assoc.originNodeURI = resolveNode(assoc.originNodeURI, `association '${oldAssocId ?? newAssocId}' originNodeURI`)
    assoc.destinationNodeURI = resolveNode(assoc.destinationNodeURI, `association '${oldAssocId ?? newAssocId}' destinationNodeURI`)
    if (assoc.CFAssociationGroupingURI) {
      assoc.CFAssociationGroupingURI = LinkDataHelper.rebaseLinkData(assoc.CFAssociationGroupingURI, caseVersion, 'CFAssociationGroupings')
    }
  }

  for (const rubric of cloned.CFRubrics ?? []) {
    const newRubricId = randomUUID()
    rubric.identifier = newRubricId
    rubric.sourcedId = newRubricId
    rubric.uri = `${base}/CFRubrics/${newRubricId}`
  }

  return cloned
}
