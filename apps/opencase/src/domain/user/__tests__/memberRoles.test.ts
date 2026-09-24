import {
  memberRoleFromScopes,
  scopesForMemberRole,
  keycloakRolesForMemberRole,
  isMemberRole
} from '../memberRoles'

describe('memberRoles', () => {
  it('maps roles to scopes', () => {
    expect(scopesForMemberRole('viewer')).toEqual(['case.read'])
    expect(scopesForMemberRole('author')).toEqual(['case.read', 'case.write'])
    expect(scopesForMemberRole('admin')).toEqual(['case.read', 'case.write', 'case.owner'])
  })

  it('includes Keycloak-visible membership role labels', () => {
    expect(keycloakRolesForMemberRole('author')).toEqual([
      'case.read',
      'case.write',
      'author'
    ])
  })

  it('derives highest role from scopes or labels', () => {
    expect(memberRoleFromScopes(['case.read'])).toBe('viewer')
    expect(memberRoleFromScopes(['viewer'])).toBe('viewer')
    expect(memberRoleFromScopes(['case.read', 'case.write'])).toBe('author')
    expect(memberRoleFromScopes(['author'])).toBe('author')
    expect(memberRoleFromScopes(['case.owner', 'case.read'])).toBe('admin')
    expect(memberRoleFromScopes(['admin'])).toBe('admin')
    expect(memberRoleFromScopes([])).toBeNull()
  })

  it('validates role names', () => {
    expect(isMemberRole('viewer')).toBe(true)
    expect(isMemberRole('user')).toBe(false)
  })
})
