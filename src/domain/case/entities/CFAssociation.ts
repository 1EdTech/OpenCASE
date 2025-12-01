import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';

export interface CFAssociationProps {
  tenantId: TenantId;
  caseVersion: CaseVersion;
  sourcedId: SourcedId;
  originNode: string;
  destinationNode: string;
  associationType: string;
  sequenceNumber?: number;
  extensions?: Array<{ type: string; data: Record<string, unknown> }>;
}

export class CFAssociation {
  private constructor(private readonly props: CFAssociationProps) {}

  static create(props: CFAssociationProps): CFAssociation {
    if (!props.sourcedId) throw new Error('CFAssociation.sourcedId is required');
    return new CFAssociation(props);
  }

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any): CFAssociation {
    return CFAssociation.create({
      tenantId,
      caseVersion,
      sourcedId: raw.sourcedId,
      originNode: raw.originNode,
      destinationNode: raw.destinationNode,
      associationType: raw.associationType,
      sequenceNumber: raw.sequenceNumber,
      extensions: raw.extensions
    });
  }

  get sourcedId(): SourcedId { return this.props.sourcedId; }

  toJSON() {
    return { ...this.props };
  }
}

