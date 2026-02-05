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

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any): CFAssociation {
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
    
    // Transform originNodeURI - extract identifier from URN if present
    let originId = raw.originNodeURI?.identifier ?? raw.originNode ?? 'unknown'
    let originUri = raw.originNodeURI?.uri
    if (originUri && UrnCaseUriHelper.isUrnCaseUri(originUri)) {
      const parsed = UrnCaseUriHelper.parseUrnCaseUri(originUri)
      if (parsed) {
        originId = parsed.identifier || originId
        originUri = UrnCaseUriHelper.urnCaseToRelativePath(originUri, caseVersion)
      }
    } else {
      originUri = originUri || this.generateItemURI(tenantId, caseVersion, originId)
    }
    const originNodeURI = {
      title: raw.originNodeURI?.title ?? String(originId),
      identifier: originId,
      uri: originUri
    }
    
    // Transform destinationNodeURI - extract identifier from URN if present
    let destinationId = raw.destinationNodeURI?.identifier ?? raw.destinationNode ?? 'unknown'
    let destinationUri = raw.destinationNodeURI?.uri
    if (destinationUri && UrnCaseUriHelper.isUrnCaseUri(destinationUri)) {
      const parsed = UrnCaseUriHelper.parseUrnCaseUri(destinationUri)
      if (parsed) {
        destinationId = parsed.identifier || destinationId
        destinationUri = UrnCaseUriHelper.urnCaseToRelativePath(destinationUri, caseVersion)
      }
    } else {
      destinationUri = destinationUri || this.generateItemURI(tenantId, caseVersion, destinationId)
    }
    const destinationNodeURI = {
      title: raw.destinationNodeURI?.title ?? String(destinationId),
      identifier: destinationId,
      uri: destinationUri
    }
    
    // Transform CFAssociationGroupingURI if present
    // CFAssociationGroupingURI must use LinkURI format (UUID identifier required)
    const CFAssociationGroupingURI = this.transformLinkData(raw.CFAssociationGroupingURI, caseVersion)
    if (CFAssociationGroupingURI) {
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

