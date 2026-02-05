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

export interface CFPackageProps {
  document: CFDocument
  items: CFItem[]
  associations: CFAssociation[]
  rubrics?: CFRubric[]
  definitions?: CFDefinitions | null
  extensions?: Record<string, unknown>
}

export class CFPackage {
  constructor (private readonly props: CFPackageProps) {}

  get document (): CFDocument { return this.props.document }
  get items (): CFItem[] { return this.props.items }
  get associations (): CFAssociation[] { return this.props.associations }
  get rubrics (): CFRubric[] { return this.props.rubrics ?? [] }
  get definitions (): CFDefinitions | null { return this.props.definitions ?? null }
  get extensions (): Record<string, unknown> | undefined { return this.props.extensions }
}
