import { UserAccountRepository } from '../ports/UserAccountRepository'
import { TenantMembershipRepository } from '../ports/TenantMembershipRepository'
import { PasswordHasher } from '../services/PasswordHasher'
import { UserAccount } from '../../../domain/user/entities/UserAccount'
import { TenantMembership } from '../../../domain/user/entities/TenantMembership'
import { type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../../infrastructure/logging/Logger'
import { randomUUID } from 'crypto'

export interface CreateUserAccountCommand {
  email: string
  password?: string
  tenantId: TenantId
  role?: 'admin' | 'user' | 'viewer'
  autoGeneratePassword?: boolean
}

export interface CreateUserAccountResult {
  accountId: string
  email: string
  password?: string // Only returned if auto-generated
  tenantId: TenantId
  role: 'admin' | 'user' | 'viewer'
}

export class CreateUserAccount {
  constructor(
    private readonly accountRepo: UserAccountRepository,
    private readonly membershipRepo: TenantMembershipRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(cmd: CreateUserAccountCommand): Promise<CreateUserAccountResult> {
    logger.info({ email: cmd.email, tenantId: cmd.tenantId }, 'Executing CreateUserAccount')

    // Check if account already exists
    const existingAccount = await this.accountRepo.findByEmail(cmd.email)
    if (existingAccount) {
      throw new Error(`Account with email '${cmd.email}' already exists`)
    }

    // Generate password if needed
    let password: string | undefined
    if (cmd.autoGeneratePassword || !cmd.password) {
      password = this.passwordHasher.generateSecurePassword()
    } else {
      password = cmd.password
    }

    // Hash password
    const passwordHash = await this.passwordHasher.hash(password!)

    // Create account
    const accountId = randomUUID()
    const now = new Date()
    const account = UserAccount.create({
      id: accountId,
      email: cmd.email,
      passwordHash,
      status: 'active',
      createdAt: now,
      updatedAt: now
    })

    await this.accountRepo.save(account)

    // Create tenant membership
    const role = cmd.role ?? 'user'
    const membershipId = randomUUID()
    const membership = TenantMembership.create({
      id: membershipId,
      accountId,
      tenantId: cmd.tenantId,
      role,
      createdAt: now
    })

    await this.membershipRepo.save(membership)

    logger.info({ accountId, email: cmd.email, tenantId: cmd.tenantId }, 'User account created successfully')

    return {
      accountId,
      email: cmd.email,
      password: cmd.autoGeneratePassword || !cmd.password ? password : undefined,
      tenantId: cmd.tenantId,
      role
    }
  }
}













