import fs from 'node:fs/promises'
import path from 'node:path'
import { UserAccountRepository } from '../../application/user/ports/UserAccountRepository'
import { UserAccount, type UserAccountId, type Email } from '../../domain/user/entities/UserAccount'
import { logger } from '../logging/Logger'

export interface FileUserAccountRepositoryConfig {
  accountsFile: string
}

interface AccountData {
  id: string
  email: string
  passwordHash: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export class FileUserAccountRepository implements UserAccountRepository {
  private accounts = new Map<string, UserAccount>()

  constructor(private readonly cfg: FileUserAccountRepositoryConfig) {}

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.cfg.accountsFile, 'utf8')
      const accountsData: AccountData[] = JSON.parse(data)

      for (const accountData of accountsData) {
        const account = UserAccount.create({
          id: accountData.id,
          email: accountData.email,
          passwordHash: accountData.passwordHash,
          status: accountData.status,
          createdAt: new Date(accountData.createdAt),
          updatedAt: new Date(accountData.updatedAt)
        })
        this.accounts.set(account.id, account)
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create empty file
        await this.ensureFileExists()
      } else {
        throw error
      }
    }
  }

  private async ensureFileExists(): Promise<void> {
    const dir = path.dirname(this.cfg.accountsFile)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(this.cfg.accountsFile, JSON.stringify([], null, 2), 'utf8')
  }

  private async persist(): Promise<void> {
    const accountsData: AccountData[] = Array.from(this.accounts.values()).map(account => ({
      id: account.id,
      email: account.email,
      passwordHash: account.passwordHash,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    }))

    await fs.writeFile(
      this.cfg.accountsFile,
      JSON.stringify(accountsData, null, 2),
      'utf8'
    )
  }

  async findById(id: UserAccountId): Promise<UserAccount | null> {
    return this.accounts.get(id) ?? null
  }

  async findByEmail(email: Email): Promise<UserAccount | null> {
    for (const account of this.accounts.values()) {
      if (account.email.toLowerCase() === email.toLowerCase()) {
        return account
      }
    }
    return null
  }

  async save(account: UserAccount): Promise<void> {
    this.accounts.set(account.id, account)
    await this.persist()
  }

  async delete(id: UserAccountId): Promise<void> {
    this.accounts.delete(id)
    await this.persist()
  }

  async findAll(): Promise<UserAccount[]> {
    return Array.from(this.accounts.values())
  }
}

