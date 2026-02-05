import { type UserAccount, type UserAccountId, type Email } from '../../../domain/user/entities/UserAccount'

export interface UserAccountRepository {
  findById(id: UserAccountId): Promise<UserAccount | null>
  findByEmail(email: Email): Promise<UserAccount | null>
  save(account: UserAccount): Promise<void>
  delete(id: UserAccountId): Promise<void>
  findAll(): Promise<UserAccount[]>
}

