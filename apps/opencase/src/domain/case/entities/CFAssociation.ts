import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';
import { LinkData, LinkDataHelper, UrnCaseUriHelper } from '../value-objects/LinkData';

export interface CFAssociationProps {
  tenantId: TenantId;
  caseVersion: CaseVersion;
  sourcedId: SourcedId;
  uri: string; // Required in v1p1
  associationType: string;
  originNodeURI: LinkData; // Required in v1p1 (was originNode string)
  destinationNodeURI: LinkData; // Required in v1p1 (was destinationNode string)
  lastChangeDateTime: Date; // Required in v1p1
  sequenceNumber?: number;
  CFAssociationGroupingURI?: LinkData;
  notes?: string; // v1.1 addition
  extensions?: Record<string, unknown>;
}

export class CFAssociation {
  private constructor(private readonly props: CFAssociationProps) {}

  static create(props: CFAssociationProps): CFAssociation {
    if (!props.sourcedId) throw new Error('CFAssociation.sourcedId is required');
    if (!props.uri) throw new Error('CFAssociation.uri is required');
    if (!props.originNodeURI) throw new Error('CFAssociation.originNodeURI is required');
    if (!props.destinationNodeURI) throw new Error('CFAssociation.destinationNodeURI is required');
    if (!props.lastChangeDateTime) throw new Error('CFAssociation.lastChangeDateTime is required');
    return new CFAssociation(props);
  }

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any, options?: { preserveUris?: boolean }): CFAssociation {
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

    let originNodeURI: LinkData
    let destinationNodeURI: LinkData
    if (options?.preserveUris && raw.originNodeURI && raw.destinationNodeURI) {
      originNodeURI = raw.originNodeURI
      destinationNodeURI = raw.destinationNodeURI
    } else {
      // originNodeURI/destinationNodeURI always reference a CFItem (or CFDocument)
      // within the SAME package being imported, so — like CFItem.CFDocumentURI —
      // their uri is always regenerated to point at the local host, regardless of
      // what URI shape (URN, absolute foreign-host URL, or relative path) the
      // source supplied. Only the identifier is trusted from the source data.
      let originId = raw.originNodeURI?.identifier ?? raw.originNode ?? 'unknown'
      const originUriFromSource = raw.originNodeURI?.uri
      if (originUriFromSource && UrnCaseUriHelper.isUrnCaseUri(originUriFromSource)) {
        const parsed = UrnCaseUriHelper.parseUrnCaseUri(originUriFromSource)
        if (parsed) {
          originId = parsed.identifier || originId
        }
      }
      originNodeURI = {
        title: raw.originNodeURI?.title ?? String(originId),
        identifier: originId,
        uri: this.generateItemURI(tenantId, caseVersion, originId)
      }

      let destinationId = raw.destinationNodeURI?.identifier ?? raw.destinationNode ?? 'unknown'
      const destinationUriFromSource = raw.destinationNodeURI?.uri
      if (destinationUriFromSource && UrnCaseUriHelper.isUrnCaseUri(destinationUriFromSource)) {
        const parsed = UrnCaseUriHelper.parseUrnCaseUri(destinationUriFromSource)
        if (parsed) {
          destinationId = parsed.identifier || destinationId
        }
      }
      destinationNodeURI = {
        title: raw.destinationNodeURI?.title ?? String(destinationId),
        identifier: destinationId,
        uri: this.generateItemURI(tenantId, caseVersion, destinationId)
      }
    }

    // CFAssociationGroupingURI references a per-tenant definition entity that
    // OpenCASE serves itself, so it's rebased onto the local host too — unless
    // this is a mirrored framework, in which case it's kept as the source supplied it.
    // CFAssociationGroupingURI must use LinkURI format (UUID identifier required)
    const CFAssociationGroupingURI = options?.preserveUris
      ? raw.CFAssociationGroupingURI
      : LinkDataHelper.rebaseLinkData(raw.CFAssociationGroupingURI, caseVersion, 'CFAssociationGroupings')
    if (CFAssociationGroupingURI && !options?.preserveUris) {
      LinkDataHelper.validateLinkURI(CFAssociationGroupingURI, 'CFAssociationGroupingURI')
    }
    
    return CFAssociation.create({
      tenantId,
      caseVersion,
      sourcedId: identifier,
      uri,
      associationType: raw.associationType,
      originNodeURI,
      destinationNodeURI,
      lastChangeDateTime: raw.lastChangeDateTime ? new Date(raw.lastChangeDateTime) : new Date(),
      sequenceNumber: raw.sequenceNumber,
      CFAssociationGroupingURI,
      notes: raw.notes,
      extensions: raw.extensions
    });
  }

  private static generateURI(tenantId: TenantId, caseVersion: CaseVersion, identifier: string): string {
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0';
    return `${basePath}/CFAssociations/${identifier}`;
  }

  private static generateItemURI(tenantId: TenantId, caseVersion: CaseVersion, identifier: string): string {
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0';
    return `${basePath}/CFItems/${identifier}`;
  }

  private static createLinkDataFromString(nodeId: string, tenantId: TenantId, caseVersion: CaseVersion): LinkData {
    return {
      title: nodeId,
      identifier: nodeId,
      uri: this.generateItemURI(tenantId, caseVersion, nodeId)
    };
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
      delete result.notes
      delete result.extensions
      if (result.originNodeURI && typeof result.originNodeURI === 'object') delete result.originNodeURI.targetType
      if (result.destinationNodeURI && typeof result.destinationNodeURI === 'object') delete result.destinationNodeURI.targetType
      if (result.CFDocumentURI && typeof result.CFDocumentURI === 'object') delete result.CFDocumentURI.targetType
      if (result.CFAssociationGroupingURI && typeof result.CFAssociationGroupingURI === 'object') delete result.CFAssociationGroupingURI.targetType
    }
    
    return result;
  }
}

