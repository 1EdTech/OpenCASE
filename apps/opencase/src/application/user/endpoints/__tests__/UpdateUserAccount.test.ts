import { UpdateUserAccount } from '../UpdateUserAccount'
import { UserAccountRepository } from '../../ports/UserAccountRepository'
import { PasswordHasher } from '../../services/PasswordHasher'
import { UserAccount } from '../../../../domain/user/entities/UserAccount'

describe('UpdateUserAccount', () => {
  let mockAccountRepo: jest.Mocked<UserAccountRepository>
  let mockPasswordHasher: jest.Mocked<PasswordHasher>
  let updateUserAccount: UpdateUserAccount

  beforeEach(() => {
    mockAccountRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
      findAll: jest.fn()
    } as any

    mockPasswordHasher = {
      hash: jest.fn().mockResolvedValue('new-hashed-password'),
      verify: jest.fn(),
      generateSecurePassword: jest.fn(),
      validatePasswordStrength: jest.fn().mockReturnValue({ valid: true })
    } as any

    updateUserAccount = new UpdateUserAccount(mockAccountRepo, mockPasswordHasher)
  })

  describe('execute', () => {
    const accountId = 'account-123'
    const account = UserAccount.create({
      id: accountId,
      email: 'user@example.com',
      passwordHash: 'old-hash',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    it('should update password successfully', async () => {
      mockAccountRepo.findById.mockResolvedValue(account)

      await updateUserAccount.execute({
        accountId,
        password: 'new-password'
      })

      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('new-password')
      expect(mockAccountRepo.save).toHaveBeenCalled()
      const savedAccount = (mockAccountRepo.save as jest.Mock).mock.calls[0][0]
      expect(savedAccount.passwordHash).toBe('new-hashed-password')
    })

    it('should update status successfully', async () => {
      mockAccountRepo.findById.mockResolvedValue(account)

      await updateUserAccount.execute({
        accountId,
        status: 'inactive'
      })

      expect(mockAccountRepo.save).toHaveBeenCalled()
      const savedAccount = (mockAccountRepo.save as jest.Mock).mock.calls[0][0]
      expect(savedAccount.status).toBe('inactive')
    })

    it('should update both password and status', async () => {
      mockAccountRepo.findById.mockResolvedValue(account)

      await updateUserAccount.execute({
        accountId,
        password: 'new-password',
        status: 'inactive'
      })

      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('new-password')
      expect(mockAccountRepo.save).toHaveBeenCalled()
      const savedAccount = (mockAccountRepo.save as jest.Mock).mock.calls[0][0]
      expect(savedAccount.passwordHash).toBe('new-hashed-password')
      expect(savedAccount.status).toBe('inactive')
    })

    it('should throw error if account not found', async () => {
      mockAccountRepo.findById.mockResolvedValue(null)

      await expect(
        updateUserAccount.execute({
          accountId,
          password: 'new-password'
        })
      ).rejects.toThrow(`Account '${accountId}' not found`)
    })
  })
})













