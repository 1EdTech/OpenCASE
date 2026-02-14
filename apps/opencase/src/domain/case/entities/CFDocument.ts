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
    
    // Transform LinkData URIs if they are URNs
    const licenseURI = this.transformLinkData(raw.licenseURI, caseVersion)
    const CFPackageURI = this.transformLinkData(raw.CFPackageURI, caseVersion)
    // subjectURI must use LinkURI format (UUID identifier required)
    const subjectURI = Array.isArray(raw.subjectURI)
      ? raw.subjectURI.map((s: any) => {
          const transformed = this.transformLinkData(s, caseVersion)
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

  /**
   * Transforms a LinkData object's URI if it's a URN, otherwise returns it unchanged
   */
  private static transformLinkData(linkData: any, caseVersion: CaseVersion): LinkData | undefined {
    if (!linkData) return undefined
    
    // If it's already a LinkData object with a URI
    if (typeof linkData === 'object' && linkData.uri) {
      const transformedUri = UrnCaseUriHelper.transformUrnIfPresent(linkData.uri, caseVersion)
      // If URI was a URN, also extract identifier from it
      let identifier = linkData.identifier
      if (linkData.uri && UrnCaseUriHelper.isUrnCaseUri(linkData.uri)) {
        const parsed = UrnCaseUriHelper.parseUrnCaseUri(linkData.uri)
        if (parsed) {
          identifier = parsed.identifier || identifier
        }
      }
      return {
        ...linkData,
        uri: transformedUri || linkData.uri,
        identifier: identifier || linkData.identifier
      }
    }
    
    // If it's a string URI, transform it
    if (typeof linkData === 'string') {
      const transformedUri = UrnCaseUriHelper.transformUrnIfPresent(linkData, caseVersion)
      const parsed = UrnCaseUriHelper.parseUrnCaseUri(linkData)
      const identifier = parsed?.identifier || LinkDataHelper.extractIdFromURI(linkData)
      return {
        title: identifier || linkData,
        identifier: identifier || linkData,
        uri: transformedUri || linkData
      }
    }
    
    return linkData
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

    // CASE 1.0 strictness: do not emit CASE 1.1-only fields
    if (effectiveVersion === '1.0') {
      delete result.frameworkType
      delete result.subjectURI
      delete result.extensions
    }
    
    return result;
  }
}

