import fs from 'node:fs/promises'
import path from 'node:path'
import { TenantMembershipRepository } from '../../application/user/ports/TenantMembershipRepository'
import { TenantMembership } from '../../domain/user/entities/TenantMembership'
import { type UserAccountId } from '../../domain/user/entities/UserAccount'
import { type TenantId } from '../../domain/case/value-objects/Identifiers'
import { logger } from '../logging/Logger'

export interface FileTenantMembershipRepositoryConfig {
  membershipsFile: string
}

interface MembershipData {
  id: string
  accountId: string
  tenantId: string
  role: 'admin' | 'user' | 'viewer'
  createdAt: string
}

export class FileTenantMembershipRepository implements TenantMembershipRepository {
  private memberships = new Map<string, TenantMembership>()

  constructor(private readonly cfg: FileTenantMembershipRepositoryConfig) {}

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.cfg.membershipsFile, 'utf8')
      const membershipsData: MembershipData[] = JSON.parse(data)

      for (const membershipData of membershipsData) {
        const membership = TenantMembership.create({
          id: membershipData.id,
          accountId: membershipData.accountId,
          tenantId: membershipData.tenantId,
          role: membershipData.role,
          createdAt: new Date(membershipData.createdAt)
        })
        this.memberships.set(membership.id, membership)
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
    const dir = path.dirname(this.cfg.membershipsFile)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(this.cfg.membershipsFile, JSON.stringify([], null, 2), 'utf8')
  }

  private async persist(): Promise<void> {
    const membershipsData: MembershipData[] = Array.from(this.memberships.values()).map(membership => ({
      id: membership.id,
      accountId: membership.accountId,
      tenantId: membership.tenantId,
      role: membership.role,
      createdAt: membership.createdAt.toISOString()
    }))

    await fs.writeFile(
      this.cfg.membershipsFile,
      JSON.stringify(membershipsData, null, 2),
      'utf8'
    )
  }

  async findById(id: string): Promise<TenantMembership | null> {
    return this.memberships.get(id) ?? null
  }

  async findByAccountId(accountId: UserAccountId): Promise<TenantMembership[]> {
    return Array.from(this.memberships.values()).filter(
      m => m.accountId === accountId
    )
  }

  async findByTenantId(tenantId: TenantId): Promise<TenantMembership[]> {
    return Array.from(this.memberships.values()).filter(
      m => m.tenantId === tenantId
    )
  }

  async findByAccountAndTenant(accountId: UserAccountId, tenantId: TenantId): Promise<TenantMembership | null> {
    for (const membership of this.memberships.values()) {
      if (membership.accountId === accountId && membership.tenantId === tenantId) {
        return membership
      }
    }
    return null
  }

  async save(membership: TenantMembership): Promise<void> {
    this.memberships.set(membership.id, membership)
    await this.persist()
  }

  async delete(id: string): Promise<void> {
    this.memberships.delete(id)
    await this.persist()
  }
}

