import { TenantMembershipRepository } from '../ports/TenantMembershipRepository'
import { UserAccountRepository } from '../ports/UserAccountRepository'
import { type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'

export interface ListTenantAccountsQuery {
  tenantId: TenantId
}

export interface TenantAccountInfo {
  accountId: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  status: 'active' | 'inactive'
  createdAt: string
}

export class ListTenantAccounts {
  constructor(
    private readonly membershipRepo: TenantMembershipRepository,
    private readonly accountRepo: UserAccountRepository
  ) {}

  async execute(query: ListTenantAccountsQuery): Promise<{ accounts: TenantAccountInfo[]; total: number }> {
    logger.info({ tenantId: query.tenantId }, 'Executing ListTenantAccounts')

    const memberships = await this.membershipRepo.findByTenantId(query.tenantId)
    const accounts: TenantAccountInfo[] = []

    for (const membership of memberships) {
      const account = await this.accountRepo.findById(membership.accountId)
      if (account) {
        accounts.push({
          accountId: account.id,
          email: account.email,
          role: membership.role,
          status: account.status,
          createdAt: account.createdAt.toISOString()
        })
      }
    }

    return {
      accounts,
      total: accounts.length
    }
  }
}













