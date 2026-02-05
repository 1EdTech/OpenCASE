import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';
import { LinkData, LinkDataHelper, UrnCaseUriHelper } from '../value-objects/LinkData';

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
    
    // Transform CFDocumentURI if it's a URN
    let docIdentifier = docId ?? raw.CFDocumentURI?.identifier ?? 'unknown'
    let generatedDocUri: string
    if (raw.CFDocumentURI?.uri && UrnCaseUriHelper.isUrnCaseUri(raw.CFDocumentURI.uri)) {
      const parsed = UrnCaseUriHelper.parseUrnCaseUri(raw.CFDocumentURI.uri)
      if (parsed) {
        docIdentifier = parsed.identifier || docIdentifier
        generatedDocUri = UrnCaseUriHelper.urnCaseToRelativePath(raw.CFDocumentURI.uri, caseVersion)
      } else {
        // Fallback if URN parsing fails
        generatedDocUri = docURI ?? this.generateDocumentURI(tenantId, caseVersion, docIdentifier)
      }
    } else {
      generatedDocUri = docURI ?? this.generateDocumentURI(tenantId, caseVersion, docIdentifier)
    }
    
    const CFDocumentURI = {
      title: raw.CFDocumentURI?.title ?? 'Document',
      identifier: docIdentifier,
      uri: generatedDocUri
    }
    
    // Transform LinkData URIs if they are URNs
    const CFItemTypeURI = this.transformLinkData(raw.CFItemTypeURI, caseVersion)
    const conceptKeywordsURI = this.transformLinkData(raw.conceptKeywordsURI, caseVersion)
    const licenseURI = this.transformLinkData(raw.licenseURI, caseVersion)
    // subjectURI must use LinkURI format (UUID identifier required)
    const subjectURI = Array.isArray(raw.subjectURI)
      ? raw.subjectURI.map((s: any) => {
          const transformed = this.transformLinkData(s, caseVersion)
          if (transformed) {
            LinkDataHelper.validateLinkURI(transformed, 'CFItem.subjectURI')
          }
          return transformed
        }).filter((s: any): s is LinkData => s !== undefined)
      : undefined
    
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
      CFItemTypeURI,
      conceptKeywords: raw.conceptKeywords,
      conceptKeywordsURI,
      notes: raw.notes,
      language: raw.language,
      subject: raw.subject,
      subjectURI,
      educationLevel: raw.educationLevel,
      licenseURI,
      statusStartDate: raw.statusStartDate,
      statusEndDate: raw.statusEndDate,
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

