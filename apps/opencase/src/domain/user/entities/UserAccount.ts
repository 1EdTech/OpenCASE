export type UserAccountId = string
export type Email = string

export type AccountStatus = 'active' | 'inactive'

export interface UserAccountProps {
  id: UserAccountId
  email: Email
  passwordHash: string
  status: AccountStatus
  createdAt: Date
  updatedAt: Date
}

export class UserAccount {
  private constructor(private readonly props: UserAccountProps) {}

  static create(props: UserAccountProps): UserAccount {
    if (!props.id) throw new Error('UserAccount.id is required')
    if (!props.email) throw new Error('UserAccount.email is required')
    if (!props.passwordHash) throw new Error('UserAccount.passwordHash is required')
    if (!props.status) throw new Error('UserAccount.status is required')
    if (!props.createdAt) throw new Error('UserAccount.createdAt is required')
    if (!props.updatedAt) throw new Error('UserAccount.updatedAt is required')

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(props.email)) {
      throw new Error('UserAccount.email must be a valid email address')
    }

    return new UserAccount(props)
  }

  get id(): UserAccountId { return this.props.id }
  get email(): Email { return this.props.email }
  get passwordHash(): string { return this.props.passwordHash }
  get status(): AccountStatus { return this.props.status }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  isActive(): boolean {
    return this.props.status === 'active'
  }

  updatePasswordHash(newHash: string): UserAccount {
    return new UserAccount({
      ...this.props,
      passwordHash: newHash,
      updatedAt: new Date()
    })
  }

  updateStatus(status: AccountStatus): UserAccount {
    return new UserAccount({
      ...this.props,
      status,
      updatedAt: new Date()
    })
  }
}













