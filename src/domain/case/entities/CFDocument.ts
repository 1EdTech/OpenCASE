import { CaseVersion, SourcedId, TenantId } from '../value-objects/Identifiers';

export interface CFDocumentProps {
  tenantId: TenantId;
  caseVersion: CaseVersion;
  sourcedId: SourcedId;
  uri?: string;
  title: string;
  description?: string;
  subject?: string;
  language?: string;
  frameworkType?: string;
  version?: string;
  lastChangeDateTime: Date;
  adoptionStatus?: string;
  licenceUri?: string;
  notes?: string;
  extensions?: Array<{ type: string; data: Record<string, unknown> }>;
}

export class CFDocument {
  private constructor(private readonly props: CFDocumentProps) {}

  static create(props: CFDocumentProps): CFDocument {
    if (!props.sourcedId) throw new Error('CFDocument.sourcedId is required');
    if (!props.title) throw new Error('CFDocument.title is required');
    return new CFDocument(props);
  }

  static fromRaw(tenantId: TenantId, caseVersion: CaseVersion, raw: any): CFDocument {
    return CFDocument.create({
      tenantId,
      caseVersion,
      sourcedId: raw.sourcedId,
      uri: raw.uri,
      title: raw.title,
      description: raw.description,
      subject: raw.subject,
      language: raw.language,
      frameworkType: raw.frameworkType,
      version: raw.version,
      lastChangeDateTime: new Date(raw.lastChangeDateTime),
      adoptionStatus: raw.adoptionStatus,
      licenceUri: raw.licenceUri,
      notes: raw.notes,
      extensions: raw.extensions
    });
  }

  get tenantId(): TenantId { return this.props.tenantId; }
  get caseVersion(): CaseVersion { return this.props.caseVersion; }
  get sourcedId(): SourcedId { return this.props.sourcedId; }

  toJSON() {
    return {
      ...this.props,
      lastChangeDateTime: this.props.lastChangeDateTime.toISOString()
    };
  }
}

