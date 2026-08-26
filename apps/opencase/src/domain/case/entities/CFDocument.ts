import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';
import { LinkData, LinkDataHelper, UrnCaseUriHelper } from '../value-objects/LinkData';

export interface CFDocumentProps {
  tenantId: TenantId;
  caseVersion: CaseVersion;
  sourcedId: SourcedId;
  uri: string; // Required in v1p1
  title: string;
  creator: string; // Required in v1p1
  description?: string;
  subject?: string | string[];
  subjectURI?: LinkData[];
  language?: string;
  frameworkType?: string;
  version?: string;
  lastChangeDateTime: Date;
  adoptionStatus?: string;
  officialSourceURL?: string;
  publisher?: string;
  licenseURI?: LinkData;
  licenceUri?: string; // Legacy support
  notes?: string;
  statusStartDate?: string;
  statusEndDate?: string;
  CFPackageURI?: LinkData;
  extensions?: Record<string, unknown>;
}

export class CFDocument {
  private constructor(private readonly props: CFDocumentProps) {}

  static create(props: CFDocumentProps): CFDocument {
    if (!props.sourcedId) throw new Error('CFDocument.sourcedId is required');
    if (!props.title) throw new Error('CFDocument.title is required');
    if (!props.uri) throw new Error('CFDocument.uri is required');
    if (!props.creator) throw new Error('CFDocument.creator is required');
    if (!props.lastChangeDateTime) throw new Error('CFDocument.lastChangeDateTime is required');
    return new CFDocument(props);
  }

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any): CFDocument {
    // Extract identifier from URN if present (priority over sourcedId/identifier)
    let identifier = raw.sourcedId || raw.identifier
    let uri = raw.uri
    
    // If URI is a URN, extract identifier and transform URI
    if (uri && UrnCaseUriHelper.isUrnCaseUri(uri)) {
      const parsed = UrnCaseUriHelper.parseUrnCaseUri(uri)
      if (parsed) {
        identifier = parsed.identifier || identifier
        uri = UrnCaseUriHelper.urnCaseToRelativePath(uri, caseVersion)
      }
    } else {
      // If not a URN, generate URI based on identifier (existing behavior)
      uri = this.generateURI(tenantId, caseVersion, identifier)
    }
    
    // Rebase reference URIs onto the local host — these point at per-tenant
    // definition entities (licenses, packages, subjects) that OpenCASE serves
    // itself, so they must resolve locally rather than to the source host.
    const licenseURI = LinkDataHelper.rebaseLinkData(raw.licenseURI, caseVersion, 'CFLicenses')
    const CFPackageURI = LinkDataHelper.rebaseLinkData(raw.CFPackageURI, caseVersion, 'CFPackages')
    // subjectURI must use LinkURI format (UUID identifier required)
    const subjectURI = Array.isArray(raw.subjectURI)
      ? raw.subjectURI.map((s: any) => {
          const transformed = LinkDataHelper.rebaseLinkData(s, caseVersion, 'CFSubjects')
          if (transformed) {
            LinkDataHelper.validateLinkURI(transformed, 'CFDocument.subjectURI')
          }
          return transformed
        }).filter((s: any): s is LinkData => s !== undefined)
      : undefined
    
    return CFDocument.create({
      tenantId,
      caseVersion,
      sourcedId: identifier,
      uri,
      title: raw.title,
      creator: raw.creator || 'Unknown', // Default for backward compatibility
      description: raw.description,
      subject: raw.subject,
      subjectURI,
      language: raw.language,
      frameworkType: raw.frameworkType,
      version: raw.version,
      lastChangeDateTime: new Date(raw.lastChangeDateTime),
      adoptionStatus: raw.adoptionStatus,
      officialSourceURL: raw.officialSourceURL,
      publisher: raw.publisher,
      licenseURI,
      licenceUri: raw.licenceUri,
      notes: raw.notes,
      statusStartDate: raw.statusStartDate,
      statusEndDate: raw.statusEndDate,
      CFPackageURI,
      extensions: raw.extensions
    });
  }

  private static generateURI(tenantId: TenantId, caseVersion: CaseVersion, identifier: string): string {
    // Generate a URI based on tenant, version, and identifier
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0';
    return `${basePath}/CFDocuments/${identifier}`;
  }

  get tenantId(): TenantId { return this.props.tenantId; }
  get caseVersion(): CaseVersion { return this.props.caseVersion; }
  get sourcedId(): SourcedId { return this.props.sourcedId; }

  toJSON(serializeAs?: CaseVersion) {
    const { tenantId, caseVersion, sourcedId, licenceUri, ...rest } = this.props;
    const effectiveVersion = serializeAs ?? caseVersion;
    const result: any = {
      identifier: sourcedId, // Map sourcedId to identifier for spec compliance
      ...rest,
      lastChangeDateTime: this.props.lastChangeDateTime.toISOString()
    };
    
    // Remove internal fields
    delete result.tenantId;
    delete result.caseVersion;
    delete result.sourcedId;
    delete result.licenceUri; // Remove legacy field, use licenseURI instead
    
    // Handle legacy licenceUri - convert to licenseURI if needed
    if (!result.licenseURI && licenceUri) {
      result.licenseURI = {
        uri: licenceUri,
        identifier: LinkDataHelper.extractIdFromURI(licenceUri),
        title: 'License'
      };
    }

    // CASE 1.1: include caseVersion (spec best practice). CASE 1.0: strip 1.1-only fields.
    if (effectiveVersion === '1.1') {
      result.caseVersion = effectiveVersion
    } else {
      delete result.frameworkType
      delete result.subjectURI
      delete result.extensions
    }

    return result;
  }
}

