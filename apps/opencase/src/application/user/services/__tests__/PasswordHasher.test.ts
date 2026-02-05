import { BcryptPasswordHasher } from '../PasswordHasher'

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn((password, rounds) => Promise.resolve(`hashed-${password}`)),
  compare: jest.fn((password, hash) => Promise.resolve(hash === `hashed-${password}`))
}))

describe('BcryptPasswordHasher', () => {
  let passwordHasher: BcryptPasswordHasher

  beforeEach(() => {
    passwordHasher = new BcryptPasswordHasher()
  })

  describe('hash', () => {
    it('should hash password successfully', async () => {
      const hash = await passwordHasher.hash('password123')

      expect(hash).toBeDefined()
      expect(hash).toContain('hashed-')
    })

    it('should throw error for password less than 8 characters', async () => {
      await expect(
        passwordHasher.hash('short')
      ).rejects.toThrow('Password must be at least 8 characters long')
    })

    it('should throw error for empty password', async () => {
      await expect(
        passwordHasher.hash('')
      ).rejects.toThrow('Password is required')
    })
  })

  describe('verify', () => {
    it('should verify correct password', async () => {
      const hash = await passwordHasher.hash('password123')
      const isValid = await passwordHasher.verify('password123', hash)

      expect(isValid).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const hash = await passwordHasher.hash('password123')
      const isValid = await passwordHasher.verify('wrong-password', hash)

      expect(isValid).toBe(false)
    })

    it('should return false for empty password or hash', async () => {
      expect(await passwordHasher.verify('', 'hash')).toBe(false)
      expect(await passwordHasher.verify('password', '')).toBe(false)
    })
  })

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = passwordHasher.generateSecurePassword(16)

      expect(password).toHaveLength(16)
    })

    it('should generate password with default length', () => {
      const password = passwordHasher.generateSecurePassword()

      expect(password).toHaveLength(16)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should validate password with 8+ characters', () => {
      const result = passwordHasher.validatePasswordStrength('password123')

      expect(result.valid).toBe(true)
    })

    it('should reject password with less than 8 characters', () => {
      const result = passwordHasher.validatePasswordStrength('short')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 8 characters')
    })

    it('should reject empty password', () => {
      const result = passwordHasher.validatePasswordStrength('')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })
  })
})













