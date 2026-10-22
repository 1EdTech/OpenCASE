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

  /**
   * @param options.preserveUris        keep the source's identifiers and URIs exactly as supplied (mirrored frameworks)
   * @param options.documentIdentifiers identifiers known to be CFDocuments (e.g. the package's own CFDocument);
   *                                    association nodes with one of these identifiers get a /CFDocuments/{id} URI
   */
  static fromRaw(
    tenantId: TenantId,
    caseVersion: CaseVersion,
    raw: any,
    options?: { preserveUris?: boolean, documentIdentifiers?: Iterable<string> }
  ): CFAssociation {
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
      // originNodeURI/destinationNodeURI reference a CFItem or a CFDocument, so —
      // like CFItem.CFDocumentURI — their uri is always regenerated to point at the
      // local host, regardless of what URI shape (URN, absolute foreign-host URL, or
      // relative path) the source supplied. Only the identifier, and whether the node
      // is a CFDocument or a CFItem, are trusted from the source data. Nodes with a
      // non-CASE targetType are kept as supplied (see buildNodeLinkData).
      const documentIdentifiers = new Set<string>(options?.documentIdentifiers ?? [])
      originNodeURI = this.buildNodeLinkData(tenantId, caseVersion, raw.originNodeURI, raw.originNode, documentIdentifiers)
      destinationNodeURI = this.buildNodeLinkData(tenantId, caseVersion, raw.destinationNodeURI, raw.destinationNode, documentIdentifiers)
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

  private static generateDocumentURI(tenantId: TenantId, caseVersion: CaseVersion, identifier: string): string {
    const basePath = caseVersion === '1.1' ? '/ims/case/v1p1' : '/ims/case/v1p0';
    return `${basePath}/CFDocuments/${identifier}`;
  }

  /**
   * Builds the local LinkData for an association node (origin or destination).
   * The node is treated as a CFDocument when its identifier is a known document
   * identifier, when the source supplied a `urn:case:document:` URN, or when the
   * source URI (relative or absolute, any CASE version) points at
   * `/CFDocuments/{identifier}`. Otherwise it is a CFItem.
   */
  private static buildNodeLinkData(
    tenantId: TenantId,
    caseVersion: CaseVersion,
    link: any,
    legacyNodeId: unknown,
    documentIdentifiers: Set<string>
  ): LinkData {
    // CASE 1.1 lets an association point outside CASE (spec §1.9.3). A node whose
    // targetType is anything other than 'CASE' is not served by OpenCASE, so it is
    // kept exactly as supplied: original uri and targetType.
    const targetType: unknown = link?.targetType
    if (typeof targetType === 'string' && targetType !== 'CASE' && link?.uri) {
      return {
        title: link.title ?? String(link.identifier ?? legacyNodeId ?? link.uri),
        identifier: link.identifier ?? legacyNodeId ?? link.uri,
        uri: link.uri,
        targetType
      }
    }

    let id = link?.identifier ?? legacyNodeId ?? 'unknown'
    const uriFromSource: unknown = link?.uri
    let isDocument = false

    if (typeof uriFromSource === 'string' && UrnCaseUriHelper.isUrnCaseUri(uriFromSource)) {
      const parsed = UrnCaseUriHelper.parseUrnCaseUri(uriFromSource)
      if (parsed) {
        id = parsed.identifier || id
        isDocument = parsed.type === 'document'
      }
    } else if (typeof uriFromSource === 'string') {
      isDocument = this.isDocumentUri(uriFromSource, String(id))
    }

    if (documentIdentifiers.has(String(id))) isDocument = true

    const result: LinkData = {
      title: link?.title ?? String(id),
      identifier: id,
      uri: isDocument
        ? this.generateDocumentURI(tenantId, caseVersion, id)
        : this.generateItemURI(tenantId, caseVersion, id)
    }
    if (targetType === 'CASE') result.targetType = targetType
    return result
  }

  /** True when `uri` is a CASE CFDocuments URI for `identifier` (e.g. `…/ims/case/v1p1/CFDocuments/{identifier}`). */
  private static isDocumentUri(uri: string, identifier: string): boolean {
    const path = uri.split(/[?#]/)[0].replace(/\/+$/, '')
    const match = path.match(/\/CFDocuments\/([^/]+)$/)
    if (!match) return false
    try {
      return decodeURIComponent(match[1]) === identifier
    } catch {
      return match[1] === identifier
    }
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
      // Copy before stripping so the entity's own LinkData keeps targetType.
      for (const key of ['originNodeURI', 'destinationNodeURI', 'CFDocumentURI', 'CFAssociationGroupingURI']) {
        if (result[key] && typeof result[key] === 'object') {
          const { targetType: _targetType, ...link } = result[key]
          result[key] = link
        }
      }
    }
    
    return result;
  }
}

