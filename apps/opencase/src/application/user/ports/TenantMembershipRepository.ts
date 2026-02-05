import { type TenantMembership } from '../../../domain/user/entities/TenantMembership'
import { type UserAccountId } from '../../../domain/user/entities/UserAccount'
import { type TenantId } from '../../../domain/case/value-objects/Identifiers'

export interface TenantMembershipRepository {
  findById(id: string): Promise<TenantMembership | null>
  findByAccountId(accountId: UserAccountId): Promise<TenantMembership[]>
  findByTenantId(tenantId: TenantId): Promise<TenantMembership[]>
  findByAccountAndTenant(accountId: UserAccountId, tenantId: TenantId): Promise<TenantMembership | null>
  save(membership: TenantMembership): Promise<void>
  delete(id: string): Promise<void>
}

