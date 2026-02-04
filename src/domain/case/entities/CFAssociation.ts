import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';
import { LinkData } from '../value-objects/LinkData';

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
    const identifier = raw.sourcedId || raw.identifier
    // Always generate URI based on requested CASE version (do not persist versioned URIs in storage)
    const uri = this.generateURI(tenantId, caseVersion, identifier)
    
    // Convert originNode/destinationNode strings to LinkData if needed
    const originId = raw.originNodeURI?.identifier ?? raw.originNode ?? 'unknown'
    const destinationId = raw.destinationNodeURI?.identifier ?? raw.destinationNode ?? 'unknown'
    const originNodeURI = {
      title: raw.originNodeURI?.title ?? String(originId),
      identifier: originId,
      uri: this.generateItemURI(tenantId, caseVersion, originId)
    }
    
    const destinationNodeURI = {
      title: raw.destinationNodeURI?.title ?? String(destinationId),
      identifier: destinationId,
      uri: this.generateItemURI(tenantId, caseVersion, destinationId)
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
      CFAssociationGroupingURI: raw.CFAssociationGroupingURI,
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

