import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers'
import { LinkData, LinkDataHelper, UrnCaseUriHelper } from '../value-objects/LinkData'

export interface CFRubricProps {
  tenantId: TenantId
  caseVersion: CaseVersion
  identifier: SourcedId
  uri: string
  lastChangeDateTime: Date
  title?: string
  description?: string
  CFRubricCriteria?: any[]
  extensions?: Record<string, unknown>
}

export class CFRubric {
  private constructor(private readonly props: CFRubricProps) {}

  static create(props: CFRubricProps): CFRubric {
    if (!props.identifier) throw new Error('CFRubric.identifier is required')
    if (!props.uri) throw new Error('CFRubric.uri is required')
    if (!props.lastChangeDateTime) throw new Error('CFRubric.lastChangeDateTime is required')
    return new CFRubric(props)
  }

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any, options?: { preserveUris?: boolean }): CFRubric {
    // Extract identifier from URN if present (priority over identifier/sourcedId)
    let identifier = raw.identifier || raw.sourcedId || raw.id
    let uri = raw.uri

    if (options?.preserveUris) {
      // Mirrored framework: keep the source's identifiers and URIs exactly as supplied.
      if (!identifier && uri && UrnCaseUriHelper.isUrnCaseUri(uri)) {
        identifier = UrnCaseUriHelper.parseUrnCaseUri(uri)?.identifier || identifier
      }
    } else if (uri && UrnCaseUriHelper.isUrnCaseUri(uri)) {
      // If URI is a URN, extract identifier and transform URI
      const parsed = UrnCaseUriHelper.parseUrnCaseUri(uri)
      if (parsed) {
        identifier = parsed.identifier || identifier
        uri = UrnCaseUriHelper.urnCaseToRelativePath(uri, caseVersion)
      }
    } else if (identifier) {
      // Not a URN — always regenerate based on identifier, same as
      // CFDocument/CFItem/CFAssociation, so a source-supplied absolute URL
      // doesn't leave the rubric's own uri pointing at the source host.
      uri = this.generateURI(tenantId, caseVersion, identifier)
    }
    
    return CFRubric.create({
      tenantId,
      caseVersion,
      identifier,
      uri,
      lastChangeDateTime: raw.lastChangeDateTime ? new Date(raw.lastChangeDateTime) : new Date(),
      title: raw.title,
      description: raw.description,
      CFRubricCriteria: raw.CFRubricCriteria || raw.criteria || [],
      extensions: raw.extensions
    })
  }

  private static generateURI(tenantId: TenantId, caseVersion: CaseVersion, identifier: string): string {
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0'
    return `${basePath}/CFRubrics/${identifier}`
  }

  get identifier(): SourcedId { return this.props.identifier }
  get tenantId(): TenantId { return this.props.tenantId }
  get caseVersion(): CaseVersion { return this.props.caseVersion }

  toJSON(serializeAs?: CaseVersion) {
    const { tenantId, caseVersion, ...rest } = this.props
    const effectiveVersion = serializeAs ?? caseVersion
    const result: any = {
      ...rest,
      lastChangeDateTime: this.props.lastChangeDateTime.toISOString()
    }
    
    // Remove internal fields
    delete result.tenantId
    delete result.caseVersion
    
    // CASE 1.0 strictness: do not emit CASE 1.1-only fields
    if (effectiveVersion === '1.0') {
      delete result.extensions
    }
    
    return result
  }
}
