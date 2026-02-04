import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';
import { LinkData, LinkDataHelper } from '../value-objects/LinkData';

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
    // Always generate URI based on requested CASE version (do not persist versioned URIs in storage)
    const identifier = raw.sourcedId || raw.identifier
    const uri = this.generateURI(tenantId, caseVersion, identifier)
    
    return CFDocument.create({
      tenantId,
      caseVersion,
      sourcedId: identifier,
      uri,
      title: raw.title,
      creator: raw.creator || 'Unknown', // Default for backward compatibility
      description: raw.description,
      subject: raw.subject,
      subjectURI: raw.subjectURI,
      language: raw.language,
      frameworkType: raw.frameworkType,
      version: raw.version,
      lastChangeDateTime: new Date(raw.lastChangeDateTime),
      adoptionStatus: raw.adoptionStatus,
      officialSourceURL: raw.officialSourceURL,
      publisher: raw.publisher,
      licenseURI: raw.licenseURI,
      licenceUri: raw.licenceUri,
      notes: raw.notes,
      statusStartDate: raw.statusStartDate,
      statusEndDate: raw.statusEndDate,
      CFPackageURI: raw.CFPackageURI,
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

  toJSON() {
    const { tenantId, caseVersion, sourcedId, licenceUri, ...rest } = this.props;
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
    if (caseVersion === '1.0') {
      delete result.frameworkType
      delete result.extensions
    }
    
    return result;
  }
}

