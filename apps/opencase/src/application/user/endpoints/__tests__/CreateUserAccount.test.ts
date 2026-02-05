import { CreateUserAccount } from '../CreateUserAccount'
import { UserAccountRepository } from '../../ports/UserAccountRepository'
import { TenantMembershipRepository } from '../../ports/TenantMembershipRepository'
import { PasswordHasher } from '../../services/PasswordHasher'
import { UserAccount } from '../../../../domain/user/entities/UserAccount'

describe('CreateUserAccount', () => {
  let mockAccountRepo: jest.Mocked<UserAccountRepository>
  let mockMembershipRepo: jest.Mocked<TenantMembershipRepository>
  let mockPasswordHasher: jest.Mocked<PasswordHasher>
  let createUserAccount: CreateUserAccount

  beforeEach(() => {
    mockAccountRepo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    } as any

    mockMembershipRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByTenantId: jest.fn(),
      findByAccountAndTenant: jest.fn(),
      delete: jest.fn()
    } as any

    mockPasswordHasher = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      verify: jest.fn(),
      generateSecurePassword: jest.fn().mockReturnValue('generated-password-123'),
      validatePasswordStrength: jest.fn().mockReturnValue({ valid: true })
    } as any

    createUserAccount = new CreateUserAccount(mockAccountRepo, mockMembershipRepo, mockPasswordHasher)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'

    it('should create user account successfully', async () => {
      const result = await createUserAccount.execute({
        email: 'user@example.com',
        password: 'password123',
        tenantId,
        role: 'user'
      })

      expect(mockAccountRepo.findByEmail).toHaveBeenCalledWith('user@example.com')
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('password123')
      expect(mockAccountRepo.save).toHaveBeenCalled()
      expect(mockMembershipRepo.save).toHaveBeenCalled()
      expect(result.email).toBe('user@example.com')
      expect(result.tenantId).toBe(tenantId)
      expect(result.role).toBe('user')
      expect(result.password).toBeUndefined() // Not auto-generated
    })

    it('should auto-generate password when requested', async () => {
      const result = await createUserAccount.execute({
        email: 'user@example.com',
        tenantId,
        autoGeneratePassword: true
      })

      expect(mockPasswordHasher.generateSecurePassword).toHaveBeenCalled()
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('generated-password-123')
      expect(result.password).toBe('generated-password-123')
    })

    it('should throw error if account already exists', async () => {
      const existingAccount = UserAccount.create({
        id: 'existing-id',
        email: 'user@example.com',
        passwordHash: 'hash',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      mockAccountRepo.findByEmail.mockResolvedValue(existingAccount)

      await expect(
        createUserAccount.execute({
          email: 'user@example.com',
          password: 'password123',
          tenantId
        })
      ).rejects.toThrow("Account with email 'user@example.com' already exists")
    })

    it('should default to user role when not specified', async () => {
      const result = await createUserAccount.execute({
        email: 'user@example.com',
        password: 'password123',
        tenantId
      })

      expect(result.role).toBe('user')
    })

    it('should create admin account with admin role', async () => {
      const result = await createUserAccount.execute({
        email: 'admin@example.com',
        password: 'password123',
        tenantId,
        role: 'admin'
      })

      expect(result.role).toBe('admin')
    })
  })
})













