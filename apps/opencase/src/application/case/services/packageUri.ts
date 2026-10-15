import type { CaseVersion, SourcedId } from '../../../domain/case/value-objects/Identifiers'
import type { LinkData } from '../../../domain/case/value-objects/LinkData'

/**
 * Derive the CFPackageURI returned on a CFDocument by getCFDocument/getCFDocuments.
 * It is never stored — a CFPackage's CFDocument (CFPckgDocument) has no
 * CFPackageURI, so it only exists in these responses.
 *
 * - Pristine mirror imported by URL: points at the source it was imported from.
 * - Everything else (forks, locally authored, mirrors pasted as JSON with no
 *   known source): points at this server's CFPackages endpoint.
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

/** Read the `ext:opencase` object off a CFDocument's extensions, if present. */
export function getOpenCaseExtension (extensions: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const ext = extensions?.['ext:opencase']
  return ext && typeof ext === 'object' ? ext as Record<string, unknown> : undefined
}
