import { type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { type UserAccountId } from './UserAccount'

export type TenantRole = 'admin' | 'user' | 'viewer'

export interface TenantMembershipProps {
  id: string
  accountId: UserAccountId
  tenantId: TenantId
  role: TenantRole
  createdAt: Date
}

export class TenantMembership {
  private constructor(private readonly props: TenantMembershipProps) {}

  static create(props: TenantMembershipProps): TenantMembership {
    if (!props.id) throw new Error('TenantMembership.id is required')
    if (!props.accountId) throw new Error('TenantMembership.accountId is required')
    if (!props.tenantId) throw new Error('TenantMembership.tenantId is required')
    if (!props.role) throw new Error('TenantMembership.role is required')
    if (!props.createdAt) throw new Error('TenantMembership.createdAt is required')

    const validRoles: TenantRole[] = ['admin', 'user', 'viewer']
    if (!validRoles.includes(props.role)) {
      throw new Error(`TenantMembership.role must be one of: ${validRoles.join(', ')}`)
    }

    return new TenantMembership(props)
  }

  get id(): string { return this.props.id }
  get accountId(): UserAccountId { return this.props.accountId }
  get tenantId(): TenantId { return this.props.tenantId }
  get role(): TenantRole { return this.props.role }
  get createdAt(): Date { return this.props.createdAt }

  /**
   * Get scopes for this membership based on role
   */
  getScopes(): string[] {
    switch (this.props.role) {
      case 'admin':
        return ['case.read', 'case.write', 'case.owner']
      case 'user':
        return ['case.read', 'case.write']
      case 'viewer':
        return ['case.read']
      default:
        return []
    }
  }

  updateRole(role: TenantRole): TenantMembership {
    const validRoles: TenantRole[] = ['admin', 'user', 'viewer']
    if (!validRoles.includes(role)) {
      throw new Error(`TenantMembership.role must be one of: ${validRoles.join(', ')}`)
    }

    return new TenantMembership({
      ...this.props,
      role
    })
  }
}

