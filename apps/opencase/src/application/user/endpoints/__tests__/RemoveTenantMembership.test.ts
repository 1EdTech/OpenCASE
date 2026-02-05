import { RemoveTenantMembership } from '../RemoveTenantMembership'
import { TenantMembershipRepository } from '../../ports/TenantMembershipRepository'
import { TenantMembership } from '../../../../domain/user/entities/TenantMembership'

describe('RemoveTenantMembership', () => {
  let mockMembershipRepo: jest.Mocked<TenantMembershipRepository>
  let removeTenantMembership: RemoveTenantMembership

  beforeEach(() => {
    mockMembershipRepo = {
      findByAccountAndTenant: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByTenantId: jest.fn(),
      save: jest.fn()
    } as any

    removeTenantMembership = new RemoveTenantMembership(mockMembershipRepo)
  })

  describe('execute', () => {
    const accountId = 'account-123'
    const tenantId = 'tenant-1'
    const membership = TenantMembership.create({
      id: 'membership-1',
      accountId,
      tenantId,
      role: 'user',
      createdAt: new Date()
    })

    it('should remove tenant membership successfully', async () => {
      mockMembershipRepo.findByAccountAndTenant.mockResolvedValue(membership)

      await removeTenantMembership.execute({
        accountId,
        tenantId
      })

      expect(mockMembershipRepo.findByAccountAndTenant).toHaveBeenCalledWith(accountId, tenantId)
      expect(mockMembershipRepo.delete).toHaveBeenCalledWith('membership-1')
    })

    it('should throw error if membership not found', async () => {
      mockMembershipRepo.findByAccountAndTenant.mockResolvedValue(null)

      await expect(
        removeTenantMembership.execute({
          accountId,
          tenantId
        })
      ).rejects.toThrow(`Membership not found for account '${accountId}' and tenant '${tenantId}'`)
    })
  })
})













