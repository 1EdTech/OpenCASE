import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFItem } from '../../../domain/case/entities/CFItem'
import { CFAssociation } from '../../../domain/case/entities/CFAssociation'
import { CFRubric } from '../../../domain/case/entities/CFRubric'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
import { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'

export interface CreateFrameworkCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  payload: {
    document: any
    items?: any[]
    associations?: any[]
    rubrics?: any[]
    definitions?: any
  }
}

export type CreateFrameworkResult =
  | { status: 'created', docId: string }
  | { status: 'published', docId: string }
  | { status: 'unchanged', docId: string }

function stableStringify (value: any): string {
  const seen = new WeakSet<object>()
  const normalize = (v: any): any => {
    if (v === null || v === undefined) return v
    if (typeof v !== 'object') return v

    if (Array.isArray(v)) {
      return v.map(normalize)
    }

    if (seen.has(v)) return v
    seen.add(v)

    const out: any = {}
    for (const k of Object.keys(v).sort()) {
      out[k] = normalize(v[k])
    }
    return out
  }

  return JSON.stringify(normalize(value))
}

function sortById (arr: any[]): any[] {
  const getId = (o: any): string => (o?.sourcedId ?? o?.identifier ?? o?.id ?? '').toString()
  return [...arr].sort((a, b) => getId(a).localeCompare(getId(b)))
}

export class CreateFramework {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly validator?: JsonSchemaValidator
  ) {}

  async execute (cmd: CreateFrameworkCommand): Promise<CreateFrameworkResult> {
    const { tenantId, caseVersion, payload } = cmd

    // Validate against JSON schema if validator is available
    if (this.validator) {
      try {
        const schemaName = caseVersion === '1.1' ? 'case-v1p1-cfpackage' : 'case-v1p0-cfpackage'
        this.validator.validate(schemaName, payload)
      } catch (error: any) {
        throw new Error(`Schema validation failed: ${error.message}`)
      }
    }

    const document = CFDocument.fromRaw(tenantId, caseVersion, payload.document)
    const docId = document.sourcedId
    const docJSON = document.toJSON()
    const docURI = docJSON.uri
    
    const items = (payload.items ?? []).map(i =>
      CFItem.fromRaw(tenantId, caseVersion, i, docId, docURI)
    )
    const associations = (payload.associations ?? []).map(a =>
      CFAssociation.fromRaw(tenantId, caseVersion, a)
    )
    const rubrics = (payload.rubrics ?? []).map(r =>
      CFRubric.fromRaw(tenantId, caseVersion, r)
    )
    const definitions = payload.definitions ?? null

    const pkg = new CFPackage({ document, items, associations, rubrics, definitions })

    // Idempotency: if this doc already exists and the resulting stored bundle would be identical,
    // don't create a new version.
    const existing = await this.pkgRepo.load(tenantId, caseVersion, docId)
    if (existing) {
      const existingBundle = {
        document: existing.document.toJSON(),
        items: sortById(existing.items.map(i => i.toJSON())),
        associations: sortById(existing.associations.map(a => a.toJSON())),
        rubrics: sortById((existing.rubrics ?? []).map(r => r.toJSON())),
        definitions: existing.definitions ?? null
      }
      const newBundle = {
        document: docJSON,
        items: sortById(items.map(i => i.toJSON())),
        associations: sortById(associations.map(a => a.toJSON())),
        rubrics: sortById(rubrics.map(r => r.toJSON())),
        definitions
      }

      if (stableStringify(existingBundle) === stableStringify(newBundle)) {
        return { status: 'unchanged', docId }
      }

      await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg)
      return { status: 'published', docId }
    }

    await this.pkgRepo.saveNewVersion(tenantId, caseVersion, pkg)
    return { status: 'created', docId }
  }
}

