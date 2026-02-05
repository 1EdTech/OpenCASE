import { UserAccountRepository } from '../ports/UserAccountRepository'
import { TenantMembershipRepository } from '../ports/TenantMembershipRepository'
import { type UserAccountId } from '../../../domain/user/entities/UserAccount'
import { logger } from '../../../infrastructure/logging/Logger'

export interface DeleteUserAccountCommand {
  accountId: UserAccountId
  tenantId?: string // Optional: if provided, only delete membership for this tenant
}

export class DeleteUserAccount {
  constructor(
    private readonly accountRepo: UserAccountRepository,
    private readonly membershipRepo: TenantMembershipRepository
  ) {}

  async execute(cmd: DeleteUserAccountCommand): Promise<void> {
    logger.info({ accountId: cmd.accountId, tenantId: cmd.tenantId }, 'Executing DeleteUserAccount')

    const account = await this.accountRepo.findById(cmd.accountId)
    if (!account) {
      throw new Error(`Account '${cmd.accountId}' not found`)
    }

    if (cmd.tenantId) {
      // Delete only the membership for this tenant
      const memberships = await this.membershipRepo.findByAccountId(cmd.accountId)
      const membership = memberships.find(m => m.tenantId === cmd.tenantId)
      
      if (!membership) {
        throw new Error(`Membership not found for account '${cmd.accountId}' and tenant '${cmd.tenantId}'`)
      }

      await this.membershipRepo.delete(membership.id)
      logger.info({ accountId: cmd.accountId, tenantId: cmd.tenantId }, 'Tenant membership deleted')
    } else {
      // Delete account and all memberships
      const memberships = await this.membershipRepo.findByAccountId(cmd.accountId)
      for (const membership of memberships) {
        await this.membershipRepo.delete(membership.id)
      }

      await this.accountRepo.delete(cmd.accountId)
      logger.info({ accountId: cmd.accountId }, 'User account and all memberships deleted')
    }
  }
}













