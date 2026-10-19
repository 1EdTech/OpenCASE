import type { CFAssociationGrouping, CFConcept, CFDefinition, CFItemType, CFLicense, CFSubject } from '@/domain/case/types'

export type DefinitionLists = {
  cfItemTypes: CFItemType[]
  cfSubjects: CFSubject[]
  cfConcepts: CFConcept[]
  cfLicenses: CFLicense[]
  cfAssociationGroupings: CFAssociationGrouping[]
}

/** Pull CFDefinitions out of a raw CFPackage response, wrapped ({ CFPackage: … }) or not. */
export function extractCfDefinitions(pkg: unknown): CFDefinition | undefined {
  const p = pkg as Record<string, unknown> | null
  if (!p) return undefined
  const inner = (p.CFPackage ?? p) as Record<string, unknown>
  const defs = inner.CFDefinitions
  return defs && typeof defs === 'object' ? (defs as CFDefinition) : undefined
}

function ownFirst<T extends { identifier: string }>(own: T[] | undefined, tenant: T[]): T[] {
  if (!own?.length) return tenant
  const ownIds = new Set(own.map((d) => d.identifier))
  return [...own, ...tenant.filter((d) => !ownIds.has(d.identifier))]
}

/**
 * Combine a framework's own definitions with the tenant-wide catalogue, own
 * copies first and replacing any tenant copy with the same identifier.
 *
 * The save path looks definitions up by identifier and the pickers take the
 * first title match, so both see the framework's own copy (with its own
 * extensions and field values) ahead of one that another framework happens to
 * share the identifier or title with.
 */
export function preferFrameworkDefinitions(own: CFDefinition | undefined, tenant: DefinitionLists): DefinitionLists {
  return {
    cfItemTypes: ownFirst(own?.CFItemTypes, tenant.cfItemTypes),
    cfSubjects: ownFirst(own?.CFSubjects, tenant.cfSubjects),
    cfConcepts: ownFirst(own?.CFConcepts, tenant.cfConcepts),
    cfLicenses: ownFirst(own?.CFLicenses, tenant.cfLicenses),
    cfAssociationGroupings: ownFirst(own?.CFAssociationGroupings, tenant.cfAssociationGroupings),
  }
}
