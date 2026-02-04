import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';
import { LinkData } from '../value-objects/LinkData';

export interface CFItemProps {
  tenantId: TenantId;
  caseVersion: CaseVersion;
  sourcedId: SourcedId;
  uri: string; // Required in v1p1
  fullStatement: string;
  lastChangeDateTime: Date; // Required in v1p1
  CFDocumentURI: LinkData; // Required in v1p1
  humanCodingScheme?: string;
  listEnumInSource?: string;
  listEnumeration?: string;
  alternativeLabel?: string;
  abbreviatedStatement?: string;
  CFItemType?: string;
  CFItemTypeURI?: LinkData;
  conceptKeywords?: string[];
  conceptKeywordsURI?: LinkData;
  notes?: string;
  language?: string;
  subject?: string | string[];
  subjectURI?: LinkData[];
  educationLevel?: string[];
  licenseURI?: LinkData;
  statusStartDate?: string;
  statusEndDate?: string;
  extensions?: Record<string, unknown>;
}

export class CFItem {
  private constructor(private readonly props: CFItemProps) {}

  static create(props: CFItemProps): CFItem {
    if (!props.sourcedId) throw new Error('CFItem.sourcedId is required');
    if (!props.fullStatement) throw new Error('CFItem.fullStatement is required');
    if (!props.uri) throw new Error('CFItem.uri is required');
    if (!props.lastChangeDateTime) throw new Error('CFItem.lastChangeDateTime is required');
    if (!props.CFDocumentURI) throw new Error('CFItem.CFDocumentURI is required');
    return new CFItem(props);
  }

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any, docId?: string, docURI?: string): CFItem {
    const identifier = raw.sourcedId || raw.identifier
    // Always generate URI based on requested CASE version (do not persist versioned URIs in storage)
    const uri = this.generateURI(tenantId, caseVersion, identifier)
    
    // Always generate CFDocumentURI for the requested CASE version.
    const docIdentifier = docId ?? raw.CFDocumentURI?.identifier ?? 'unknown'
    const generatedDocUri = docURI ?? this.generateDocumentURI(tenantId, caseVersion, docIdentifier)
    const CFDocumentURI = {
      title: raw.CFDocumentURI?.title ?? 'Document',
      identifier: docIdentifier,
      uri: generatedDocUri
    }
    
    return CFItem.create({
      tenantId,
      caseVersion,
      sourcedId: identifier,
      uri,
      fullStatement: raw.fullStatement,
      lastChangeDateTime: raw.lastChangeDateTime ? new Date(raw.lastChangeDateTime) : new Date(),
      CFDocumentURI,
      humanCodingScheme: raw.humanCodingScheme,
      listEnumInSource: raw.listEnumInSource,
      listEnumeration: raw.listEnumeration,
      alternativeLabel: raw.alternativeLabel,
      abbreviatedStatement: raw.abbreviatedStatement,
      CFItemType: raw.CFItemType,
      CFItemTypeURI: raw.CFItemTypeURI,
      conceptKeywords: raw.conceptKeywords,
      conceptKeywordsURI: raw.conceptKeywordsURI,
      notes: raw.notes,
      language: raw.language,
      subject: raw.subject,
      subjectURI: raw.subjectURI,
      educationLevel: raw.educationLevel,
      licenseURI: raw.licenseURI,
      statusStartDate: raw.statusStartDate,
      statusEndDate: raw.statusEndDate,
      extensions: raw.extensions
    });
  }

  private static generateURI(tenantId: TenantId, caseVersion: CaseVersion, identifier: string): string {
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0';
    return `${basePath}/CFItems/${identifier}`;
  }

  private static generateDocumentURI(tenantId: TenantId, caseVersion: CaseVersion, docId: string): string {
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0';
    return `${basePath}/CFDocuments/${docId}`;
  }

  get sourcedId(): SourcedId { return this.props.sourcedId; }

  toJSON() {
    const { tenantId, caseVersion, sourcedId, ...rest } = this.props;
    const result: any = {
      identifier: sourcedId, // Map sourcedId to identifier for spec compliance
      ...rest,
      lastChangeDateTime: this.props.lastChangeDateTime.toISOString()
    };
    
    // Remove internal fields
    delete result.tenantId;
    delete result.caseVersion;
    delete result.sourcedId;

    // CASE 1.0 strictness: do not emit CASE 1.1-only fields
    if (caseVersion === '1.0') {
      delete result.subject
      delete result.subjectURI
      delete result.extensions
      // LinkGenURI.targetType is a CASE 1.1 addition; if present in LinkData, remove it.
      if (result.CFDocumentURI && typeof result.CFDocumentURI === 'object') {
        delete result.CFDocumentURI.targetType
      }
      if (result.CFItemTypeURI && typeof result.CFItemTypeURI === 'object') {
        delete result.CFItemTypeURI.targetType
      }
      if (result.conceptKeywordsURI && typeof result.conceptKeywordsURI === 'object') {
        delete result.conceptKeywordsURI.targetType
      }
      if (Array.isArray(result.subjectURI)) {
        for (const s of result.subjectURI) {
          if (s && typeof s === 'object') delete s.targetType
        }
      }
    }
    
    return result;
  }
}

