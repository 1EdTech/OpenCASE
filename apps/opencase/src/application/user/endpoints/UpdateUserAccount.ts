import { UserAccountRepository } from '../ports/UserAccountRepository'
import { PasswordHasher } from '../services/PasswordHasher'
import { type UserAccountId } from '../../../domain/user/entities/UserAccount'
import { logger } from '../../../infrastructure/logging/Logger'

export interface UpdateUserAccountCommand {
  accountId: UserAccountId
  password?: string
  status?: 'active' | 'inactive'
}

export class UpdateUserAccount {
  constructor(
    private readonly accountRepo: UserAccountRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(cmd: UpdateUserAccountCommand): Promise<void> {
    logger.info({ accountId: cmd.accountId }, 'Executing UpdateUserAccount')

    const account = await this.accountRepo.findById(cmd.accountId)
    if (!account) {
      throw new Error(`Account '${cmd.accountId}' not found`)
    }

    let updatedAccount = account

    // Update password if provided
    if (cmd.password) {
      const passwordHash = await this.passwordHasher.hash(cmd.password)
      updatedAccount = updatedAccount.updatePasswordHash(passwordHash)
    }

    // Update status if provided
    if (cmd.status) {
      updatedAccount = updatedAccount.updateStatus(cmd.status)
    }

    await this.accountRepo.save(updatedAccount)
    logger.info({ accountId: cmd.accountId }, 'User account updated successfully')
  }
}













