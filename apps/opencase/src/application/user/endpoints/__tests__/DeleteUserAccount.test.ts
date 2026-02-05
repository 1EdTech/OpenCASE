import { DeleteUserAccount } from '../DeleteUserAccount'
import { UserAccountRepository } from '../../ports/UserAccountRepository'
import { TenantMembershipRepository } from '../../ports/TenantMembershipRepository'
import { UserAccount } from '../../../../domain/user/entities/UserAccount'
import { TenantMembership } from '../../../../domain/user/entities/TenantMembership'

describe('DeleteUserAccount', () => {
  let mockAccountRepo: jest.Mocked<UserAccountRepository>
  let mockMembershipRepo: jest.Mocked<TenantMembershipRepository>
  let deleteUserAccount: DeleteUserAccount

  beforeEach(() => {
    mockAccountRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn()
    } as any

    mockMembershipRepo = {
      findByAccountId: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByTenantId: jest.fn(),
      findByAccountAndTenant: jest.fn(),
      save: jest.fn()
    } as any

    deleteUserAccount = new DeleteUserAccount(mockAccountRepo, mockMembershipRepo)
  })

  describe('execute', () => {
    const accountId = 'account-123'

    it('should delete account and all memberships when tenantId not specified', async () => {
      const account = UserAccount.create({
        id: accountId,
        email: 'user@example.com',
        passwordHash: 'hash',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const membership1 = TenantMembership.create({
        id: 'membership-1',
        accountId,
        tenantId: 'tenant-1',
        role: 'user',
        createdAt: new Date()
      })

      const membership2 = TenantMembership.create({
        id: 'membership-2',
        accountId,
        tenantId: 'tenant-2',
        role: 'admin',
        createdAt: new Date()
      })

      mockAccountRepo.findById.mockResolvedValue(account)
      mockMembershipRepo.findByAccountId.mockResolvedValue([membership1, membership2])

      await deleteUserAccount.execute({ accountId })

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId)
      expect(mockMembershipRepo.findByAccountId).toHaveBeenCalledWith(accountId)
      expect(mockMembershipRepo.delete).toHaveBeenCalledTimes(2)
      expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId)
    })

    it('should delete only specific tenant membership when tenantId specified', async () => {
      const account = UserAccount.create({
        id: accountId,
        email: 'user@example.com',
        passwordHash: 'hash',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const membership = TenantMembership.create({
        id: 'membership-1',
        accountId,
        tenantId: 'tenant-1',
        role: 'user',
        createdAt: new Date()
      })

      mockAccountRepo.findById.mockResolvedValue(account)
      mockMembershipRepo.findByAccountId.mockResolvedValue([membership])

      await deleteUserAccount.execute({ accountId, tenantId: 'tenant-1' })

      expect(mockMembershipRepo.delete).toHaveBeenCalledWith('membership-1')
      expect(mockAccountRepo.delete).not.toHaveBeenCalled()
    })

    it('should throw error if account not found', async () => {
      mockAccountRepo.findById.mockResolvedValue(null)

      await expect(
        deleteUserAccount.execute({ accountId })
      ).rejects.toThrow(`Account '${accountId}' not found`)
    })

    it('should throw error if membership not found for specific tenant', async () => {
      const account = UserAccount.create({
        id: accountId,
        email: 'user@example.com',
        passwordHash: 'hash',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      mockAccountRepo.findById.mockResolvedValue(account)
      mockMembershipRepo.findByAccountId.mockResolvedValue([])

      await expect(
        deleteUserAccount.execute({ accountId, tenantId: 'tenant-1' })
      ).rejects.toThrow("Membership not found for account 'account-123' and tenant 'tenant-1'")
    })
  })
})













