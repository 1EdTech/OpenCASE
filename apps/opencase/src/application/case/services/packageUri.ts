import type { CaseVersion, SourcedId } from '../../../domain/case/value-objects/Identifiers'
import type { LinkData } from '../../../domain/case/value-objects/LinkData'

/**
 * Derive the CFPackageURI returned on a CFDocument by getCFDocument/getCFDocuments.
 * It is never stored — a CFPackage's CFDocument (CFPckgDocument) has no
 * CFPackageURI, so it only exists in these responses.
 *
 * - Pristine mirror with a known source (imported by URL, or pasted as JSON
 *   whose source could be derived — see deriveSourcePackageURI): points at that source.
 * - Everything else (forks, locally authored, mirrors pasted as JSON with no
 *   derivable source): points at this server's CFPackages endpoint.
 */
export function buildCFPackageURI (
  docId: SourcedId,
  caseVersion: CaseVersion,
  openCaseExtensions: Record<string, unknown> | undefined
): LinkData {
  const sourcePackageURI = openCaseExtensions?.sourcePackageURI
  const isPristineMirror = openCaseExtensions?.isModifiedFromSource === false
  const uri = isPristineMirror && typeof sourcePackageURI === 'string' && sourcePackageURI.trim() !== ''
    ? sourcePackageURI.trim()
    : `${caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'}/CFPackages/${docId}`
  return { title: 'CFPackage', identifier: docId, uri }
}

/**
 * Work out the publisher's CFPackage URL for a framework pasted/uploaded as JSON,
 * where there's no import endpoint to record. Uses the CFDocument's own
 * CFPackageURI if the publisher included one, otherwise derives it from a
 * CASE-API-shaped CFDocument uri (`…/ims/case/v1pX/CFDocuments/{id}` →
 * `…/ims/case/v1pX/CFPackages/{id}`). Only absolute http(s) URLs are accepted;
 * returns undefined when no source can be determined.
 */
export function deriveSourcePackageURI (cfDocument: any): string | undefined {
  const isAbsoluteHttp = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v.trim())

  const declared = cfDocument?.CFPackageURI?.uri
  if (isAbsoluteHttp(declared)) return declared.trim()

  const docUri = cfDocument?.uri
  if (!isAbsoluteHttp(docUri)) return undefined
  const match = docUri.trim().match(/^(.*\/ims\/case\/v1p[01])\/CFDocuments\/([^/?#]+)\/?$/i)
  return match ? `${match[1]}/CFPackages/${match[2]}` : undefined
}

/** Read the `ext:opencase` object off a CFDocument's extensions, if present. */
export function getOpenCaseExtension (extensions: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const ext = extensions?.['ext:opencase']
  return ext && typeof ext === 'object' ? ext as Record<string, unknown> : undefined
}
