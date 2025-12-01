import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';

export interface CFItemProps {
  tenantId: TenantId;
  caseVersion: CaseVersion;
  sourcedId: SourcedId;
  fullStatement: string;
  humanCodingScheme?: string;
  listEnumInSource?: string;
  notes?: string;
  language?: string;
  extensions?: Array<{ type: string; data: Record<string, unknown> }>;
}

export class CFItem {
  private constructor(private readonly props: CFItemProps) {}

  static create(props: CFItemProps): CFItem {
    if (!props.sourcedId) throw new Error('CFItem.sourcedId is required');
    if (!props.fullStatement) throw new Error('CFItem.fullStatement is required');
    return new CFItem(props);
  }

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any): CFItem {
    return CFItem.create({
      tenantId,
      caseVersion,
      sourcedId: raw.sourcedId,
      fullStatement: raw.fullStatement,
      humanCodingScheme: raw.humanCodingScheme,
      listEnumInSource: raw.listEnumInSource,
      notes: raw.notes,
      language: raw.language,
      extensions: raw.extensions
    });
  }

  get sourcedId(): SourcedId { return this.props.sourcedId; }

  toJSON() {
    return { ...this.props };
  }
}

