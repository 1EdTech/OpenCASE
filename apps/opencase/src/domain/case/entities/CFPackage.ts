import { type CFDocument } from './CFDocument'
import { type CFItem } from './CFItem'
import { type CFAssociation } from './CFAssociation'
import { type CFRubric } from './CFRubric'

export interface CFDefinitions {
  CFConcepts?: any[]
  CFSubjects?: any[]
  CFLicenses?: any[]
  CFItemTypes?: any[]
  CFAssociationGroupings?: any[]
  extensions?: Record<string, unknown>
}

/**
 * Fields each CFDefinitions entry may carry, per the CASE v1.1 CFPackage schema
 * (CFConcept, CFSubject, CFLicense, CFItemType, CFAssociationGrouping).
 * Anything else on an incoming entry is dropped rather than persisted.
 */
const DEFINITION_FIELDS: Record<string, readonly string[]> = {
  CFConcepts: ['identifier', 'uri', 'title', 'keywords', 'hierarchyCode', 'description', 'lastChangeDateTime', 'extensions'],
  CFSubjects: ['identifier', 'uri', 'title', 'hierarchyCode', 'description', 'lastChangeDateTime', 'extensions'],
  CFLicenses: ['identifier', 'uri', 'title', 'description', 'licenseText', 'lastChangeDateTime', 'extensions'],
  CFItemTypes: ['identifier', 'uri', 'title', 'description', 'hierarchyCode', 'typeCode', 'lastChangeDateTime', 'extensions'],
  CFAssociationGroupings: ['identifier', 'uri', 'title', 'description', 'lastChangeDateTime', 'extensions']
}

function pickFields (entry: any, fields: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (entry[f] !== undefined) out[f] = entry[f]
  }
  return out
}

/**
 * Keep only the spec-defined categories and entry fields of a CFDefinitions
 * block — the same whitelisting CFDocument/CFItem/CFAssociation.fromRaw apply
 * to their own fields — so unknown data from an import is ignored, not saved.
 */
export function sanitizeCFDefinitions (raw: any): CFDefinitions | null {
  if (!raw || typeof raw !== 'object') return null
  const result: CFDefinitions = {}
  for (const [category, fields] of Object.entries(DEFINITION_FIELDS)) {
    const entries = raw[category]
    if (!Array.isArray(entries)) continue
    (result as any)[category] = entries
      .filter((e: unknown) => e && typeof e === 'object')
      .map((e: any) => pickFields(e, fields))
  }
  if (raw.extensions && typeof raw.extensions === 'object') result.extensions = raw.extensions
  return result
}

export interface CFPackageProps {
  document: CFDocument
  items: CFItem[]
  associations: CFAssociation[]
  rubrics?: CFRubric[]
  definitions?: CFDefinitions | null
  extensions?: Record<string, unknown>
}

export class CFPackage {
  private readonly props: CFPackageProps

  constructor (props: CFPackageProps) {
    this.props = { ...props, definitions: sanitizeCFDefinitions(props.definitions) }
  }

  get document (): CFDocument { return this.props.document }
  get items (): CFItem[] { return this.props.items }
  get associations (): CFAssociation[] { return this.props.associations }
  get rubrics (): CFRubric[] { return this.props.rubrics ?? [] }
  get definitions (): CFDefinitions | null { return this.props.definitions ?? null }
  get extensions (): Record<string, unknown> | undefined { return this.props.extensions }
}
