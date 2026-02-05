import { AddTenantMembership } from '../AddTenantMembership'
import { UserAccountRepository } from '../../ports/UserAccountRepository'
import { TenantMembershipRepository } from '../../ports/TenantMembershipRepository'
import { UserAccount } from '../../../../domain/user/entities/UserAccount'

describe('AddTenantMembership', () => {
  let mockAccountRepo: jest.Mocked<UserAccountRepository>
  let mockMembershipRepo: jest.Mocked<TenantMembershipRepository>
  let addTenantMembership: AddTenantMembership

  beforeEach(() => {
    mockAccountRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    } as any

    mockMembershipRepo = {
      findByAccountAndTenant: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByTenantId: jest.fn(),
      delete: jest.fn()
    } as any

    addTenantMembership = new AddTenantMembership(mockAccountRepo, mockMembershipRepo)
  })

  describe('execute', () => {
    const accountId = 'account-123'
    const tenantId = 'tenant-1'
    const account = UserAccount.create({
      id: accountId,
      email: 'user@example.com',
      passwordHash: 'hash',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    it('should add tenant membership successfully', async () => {
      mockAccountRepo.findById.mockResolvedValue(account)

      await addTenantMembership.execute({
        accountId,
        tenantId,
        role: 'user'
      })

      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId)
      expect(mockMembershipRepo.findByAccountAndTenant).toHaveBeenCalledWith(accountId, tenantId)
      expect(mockMembershipRepo.save).toHaveBeenCalled()
    })

    it('should default to user role when not specified', async () => {
      mockAccountRepo.findById.mockResolvedValue(account)

      await addTenantMembership.execute({
        accountId,
        tenantId
      })

      expect(mockMembershipRepo.save).toHaveBeenCalled()
      const savedMembership = (mockMembershipRepo.save as jest.Mock).mock.calls[0][0]
      expect(savedMembership.role).toBe('user')
    })

    it('should throw error if account not found', async () => {
      mockAccountRepo.findById.mockResolvedValue(null)

      await expect(
        addTenantMembership.execute({
          accountId,
          tenantId
        })
      ).rejects.toThrow(`Account '${accountId}' not found`)
    })

    it('should throw error if membership already exists', async () => {
      const { TenantMembership } = require('../../../../domain/user/entities/TenantMembership')
      const existingMembership = TenantMembership.create({
        id: 'membership-1',
        accountId,
        tenantId,
        role: 'user',
        createdAt: new Date()
      })

      mockAccountRepo.findById.mockResolvedValue(account)
      mockMembershipRepo.findByAccountAndTenant.mockResolvedValue(existingMembership)

      await expect(
        addTenantMembership.execute({
          accountId,
          tenantId
        })
      ).rejects.toThrow(`Membership already exists for account '${accountId}' and tenant '${tenantId}'`)
    })
  })
})













