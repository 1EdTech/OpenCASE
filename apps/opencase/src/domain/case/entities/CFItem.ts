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

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any, docId?: string, docURI?: string, options?: { preserveUris?: boolean }): CFItem {
    // Extract identifier from URN if present (priority over sourcedId/identifier)
    let identifier = raw.sourcedId || raw.identifier
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
    } else {
      // If not a URN, generate URI based on identifier (existing behavior)
      uri = this.generateURI(tenantId, caseVersion, identifier)
    }

    let CFDocumentURI: LinkData
    if (options?.preserveUris && raw.CFDocumentURI) {
      CFDocumentURI = raw.CFDocumentURI
    } else {
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

      CFDocumentURI = {
        title: raw.CFDocumentURI?.title ?? 'Document',
        identifier: docIdentifier,
        uri: generatedDocUri
      }
    }

    // Rebase reference URIs onto the local host — these point at per-tenant
    // definition entities (item types, concepts, licenses, subjects) that
    // OpenCASE serves itself, so they must resolve locally rather than to
    // the source host. Mirrored frameworks skip this and keep the source's
    // reference URIs as-is.
    const CFItemTypeURI = options?.preserveUris ? raw.CFItemTypeURI : LinkDataHelper.rebaseLinkData(raw.CFItemTypeURI, caseVersion, 'CFItemTypes')
    const conceptKeywordsURI = options?.preserveUris ? raw.conceptKeywordsURI : LinkDataHelper.rebaseLinkData(raw.conceptKeywordsURI, caseVersion, 'CFConcepts')
    const licenseURI = options?.preserveUris ? raw.licenseURI : LinkDataHelper.rebaseLinkData(raw.licenseURI, caseVersion, 'CFLicenses')
    // subjectURI must use LinkURI format (UUID identifier required)
    const subjectURI = options?.preserveUris
      ? raw.subjectURI
      : Array.isArray(raw.subjectURI)
        ? raw.subjectURI.map((s: any) => {
            const transformed = LinkDataHelper.rebaseLinkData(s, caseVersion, 'CFSubjects')
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

  private static generateURI(tenantId: TenantId, caseVersion: CaseVersion, identifier: string): string {
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0';
    return `${basePath}/CFItems/${identifier}`;
  }

  private static generateDocumentURI(tenantId: TenantId, caseVersion: CaseVersion, docId: string): string {
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0';
    return `${basePath}/CFDocuments/${docId}`;
  }

  get sourcedId(): SourcedId { return this.props.sourcedId; }

  toJSON(serializeAs?: CaseVersion) {
    const { tenantId, caseVersion, sourcedId, ...rest } = this.props;
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

    // CASE 1.0 strictness: do not emit CASE 1.1-only fields
    if (effectiveVersion === '1.0') {
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

