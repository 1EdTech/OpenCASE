import bcrypt from 'bcrypt'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
  generateSecurePassword(length?: number): string
  validatePasswordStrength(password: string): { valid: boolean; error?: string }
}

export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds: number

  constructor(saltRounds: number = 10) {
    this.saltRounds = saltRounds
  }

  async hash(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password is required')
    }

    const validation = this.validatePasswordStrength(password)
    if (!validation.valid) {
      throw new Error(validation.error || 'Password does not meet requirements')
    }

    return await bcrypt.hash(password, this.saltRounds)
  }

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false
    }

    try {
      return await bcrypt.compare(password, hash)
    } catch {
      return false
    }
  }

  generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    const randomValues = require('crypto').randomBytes(length)
    let password = ''

    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length]
    }

    return password
  }

  validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (!password) {
      return { valid: false, error: 'Password is required' }
    }

    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long' }
    }

    return { valid: true }
  }
}













