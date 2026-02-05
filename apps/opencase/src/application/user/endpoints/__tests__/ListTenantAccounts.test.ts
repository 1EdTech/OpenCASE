import { ListTenantAccounts } from '../ListTenantAccounts'
import { TenantMembershipRepository } from '../../ports/TenantMembershipRepository'
import { UserAccountRepository } from '../../ports/UserAccountRepository'
import { TenantMembership } from '../../../../domain/user/entities/TenantMembership'
import { UserAccount } from '../../../../domain/user/entities/UserAccount'

describe('ListTenantAccounts', () => {
  let mockMembershipRepo: jest.Mocked<TenantMembershipRepository>
  let mockAccountRepo: jest.Mocked<UserAccountRepository>
  let listTenantAccounts: ListTenantAccounts

  beforeEach(() => {
    mockMembershipRepo = {
      findByTenantId: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByAccountAndTenant: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    } as any

    mockAccountRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    } as any

    listTenantAccounts = new ListTenantAccounts(mockMembershipRepo, mockAccountRepo)
  })

  describe('execute', () => {
    const tenantId = 'test-tenant'

    it('should list all accounts for a tenant', async () => {
      const membership1 = TenantMembership.create({
        id: 'membership-1',
        accountId: 'account-1',
        tenantId,
        role: 'admin',
        createdAt: new Date()
      })

      const membership2 = TenantMembership.create({
        id: 'membership-2',
        accountId: 'account-2',
        tenantId,
        role: 'user',
        createdAt: new Date()
      })

      const account1 = UserAccount.create({
        id: 'account-1',
        email: 'admin@example.com',
        passwordHash: 'hash',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const account2 = UserAccount.create({
        id: 'account-2',
        email: 'user@example.com',
        passwordHash: 'hash',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      mockMembershipRepo.findByTenantId.mockResolvedValue([membership1, membership2])
      mockAccountRepo.findById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2)

      const result = await listTenantAccounts.execute({ tenantId })

      expect(mockMembershipRepo.findByTenantId).toHaveBeenCalledWith(tenantId)
      expect(result.accounts).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.accounts[0].email).toBe('admin@example.com')
      expect(result.accounts[0].role).toBe('admin')
      expect(result.accounts[1].email).toBe('user@example.com')
      expect(result.accounts[1].role).toBe('user')
    })

    it('should return empty array when no accounts exist', async () => {
      const result = await listTenantAccounts.execute({ tenantId })

      expect(result.accounts).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should skip accounts that are not found', async () => {
      const membership = TenantMembership.create({
        id: 'membership-1',
        accountId: 'account-1',
        tenantId,
        role: 'user',
        createdAt: new Date()
      })

      mockMembershipRepo.findByTenantId.mockResolvedValue([membership])
      mockAccountRepo.findById.mockResolvedValue(null)

      const result = await listTenantAccounts.execute({ tenantId })

      expect(result.accounts).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})













