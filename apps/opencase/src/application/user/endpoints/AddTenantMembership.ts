import { UserAccountRepository } from '../ports/UserAccountRepository'
import { TenantMembershipRepository } from '../ports/TenantMembershipRepository'
import { TenantMembership } from '../../../domain/user/entities/TenantMembership'
import { type UserAccountId } from '../../../domain/user/entities/UserAccount'
import { type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { randomUUID } from 'crypto'

export interface AddTenantMembershipCommand {
  accountId: UserAccountId
  tenantId: TenantId
  role?: 'admin' | 'user' | 'viewer'
}

export class AddTenantMembership {
  constructor(
    private readonly accountRepo: UserAccountRepository,
    private readonly membershipRepo: TenantMembershipRepository
  ) {}

  async execute(cmd: AddTenantMembershipCommand): Promise<void> {
    logger.info({ accountId: cmd.accountId, tenantId: cmd.tenantId }, 'Executing AddTenantMembership')

    // Verify account exists
    const account = await this.accountRepo.findById(cmd.accountId)
    if (!account) {
      throw new Error(`Account '${cmd.accountId}' not found`)
    }

    // Check if membership already exists
    const existing = await this.membershipRepo.findByAccountAndTenant(cmd.accountId, cmd.tenantId)
    if (existing) {
      throw new Error(`Membership already exists for account '${cmd.accountId}' and tenant '${cmd.tenantId}'`)
    }

    // Create membership
    const role = cmd.role ?? 'user'
    const membership = TenantMembership.create({
      id: randomUUID(),
      accountId: cmd.accountId,
      tenantId: cmd.tenantId,
      role,
      createdAt: new Date()
    })

    await this.membershipRepo.save(membership)
    logger.info({ accountId: cmd.accountId, tenantId: cmd.tenantId, role }, 'Tenant membership added')
  }
}













