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

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any): CFRubric {
    // Extract identifier from URN if present (priority over identifier/sourcedId)
    let identifier = raw.identifier || raw.sourcedId || raw.id
    let uri = raw.uri
    
    // If URI is a URN, extract identifier and transform URI
    if (uri && UrnCaseUriHelper.isUrnCaseUri(uri)) {
      const parsed = UrnCaseUriHelper.parseUrnCaseUri(uri)
      if (parsed) {
        identifier = parsed.identifier || identifier
        uri = UrnCaseUriHelper.urnCaseToRelativePath(uri, caseVersion)
      }
    } else if (!uri && identifier) {
      // Generate URI based on identifier if not provided
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

  toJSON() {
    const { tenantId, caseVersion, ...rest } = this.props
    const result: any = {
      ...rest,
      lastChangeDateTime: this.props.lastChangeDateTime.toISOString()
    }
    
    // Remove internal fields
    delete result.tenantId
    delete result.caseVersion
    
    // CASE 1.0 strictness: do not emit CASE 1.1-only fields
    if (caseVersion === '1.0') {
      delete result.extensions
    }
    
    return result
  }
}
