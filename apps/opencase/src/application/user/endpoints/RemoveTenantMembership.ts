import { TenantMembershipRepository } from '../ports/TenantMembershipRepository'
import { type UserAccountId } from '../../../domain/user/entities/UserAccount'
import { type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'

export interface RemoveTenantMembershipCommand {
  accountId: UserAccountId
  tenantId: TenantId
}

export class RemoveTenantMembership {
  constructor(
    private readonly membershipRepo: TenantMembershipRepository
  ) {}

  async execute(cmd: RemoveTenantMembershipCommand): Promise<void> {
    logger.info({ accountId: cmd.accountId, tenantId: cmd.tenantId }, 'Executing RemoveTenantMembership')

    const membership = await this.membershipRepo.findByAccountAndTenant(cmd.accountId, cmd.tenantId)
    if (!membership) {
      throw new Error(`Membership not found for account '${cmd.accountId}' and tenant '${cmd.tenantId}'`)
    }

    await this.membershipRepo.delete(membership.id)
    logger.info({ accountId: cmd.accountId, tenantId: cmd.tenantId }, 'Tenant membership removed')
  }
}













