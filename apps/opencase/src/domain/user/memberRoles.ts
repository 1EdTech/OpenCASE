export type MemberRole = 'viewer' | 'author' | 'admin'

/** JWT / scope roles used by OpenCASE middleware. */
export const TENANT_CASE_ROLES = ['case.read', 'case.write', 'case.owner'] as const

/** Human-readable Keycloak client roles shown in the Admin Console and Members UI. */
export const TENANT_MEMBER_ROLES = ['viewer', 'author', 'admin'] as const

/** All Keycloak client roles managed by OpenCASE membership. */
export const TENANT_MEMBERSHIP_ROLES = [
  ...TENANT_CASE_ROLES,
  ...TENANT_MEMBER_ROLES
] as const

export function scopesForMemberRole (role: MemberRole): string[] {
  switch (role) {
    case 'viewer':
      return ['case.read']
    case 'author':
      return ['case.read', 'case.write']
    case 'admin':
      return ['case.read', 'case.write', 'case.owner']
    default:
      return []
  }
}

/**
 * Roles assigned on the Keycloak tenant client for a membership role:
 * the human-readable label (viewer/author/admin) plus the case.* scopes for JWT.
 */
export function keycloakRolesForMemberRole (role: MemberRole): string[] {
  return [...scopesForMemberRole(role), role]
}

/**
 * Derive the highest member role from a set of client roles.
 * Prefers explicit viewer/author/admin labels, then falls back to case.* scopes.
 */
export function memberRoleFromScopes (scopes: string[]): MemberRole | null {
  const set = new Set(scopes)
  if (set.has('admin') || set.has('case.owner')) return 'admin'
  if (set.has('author') || set.has('case.write')) return 'author'
  if (set.has('viewer') || set.has('case.read')) return 'viewer'
  return null
}

export function isMemberRole (value: unknown): value is MemberRole {
  return value === 'viewer' || value === 'author' || value === 'admin'
}

export function isManagedMembershipRole (name: string): boolean {
  return (TENANT_MEMBERSHIP_ROLES as readonly string[]).includes(name)
}
