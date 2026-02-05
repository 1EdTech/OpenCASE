import { CreateTenant } from '../CreateTenant'
import fs from 'node:fs/promises'
import path from 'node:path'

jest.mock('node:fs/promises')

describe('CreateTenant', () => {
  let createTenant: CreateTenant
  const mockProvisioner = {
    provisionTenant: jest.fn().mockResolvedValue({
      adminEmail: 'admin@new-tenant.local',
      adminPassword: 'temp-password'
    })
  }

  beforeEach(() => {
    createTenant = new CreateTenant(mockProvisioner as any)
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const baseDataDir = '/test/data'
    const tenantId = 'new-tenant'

    it('should create tenant directory structure', async () => {
      const error = new Error('ENOENT')
      ;(error as any).code = 'ENOENT'
      ;(fs.stat as jest.Mock).mockRejectedValue(error)
      ;(fs.mkdir as jest.Mock).mockResolvedValue(undefined)
      ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)

      await createTenant.execute({ baseDataDir, tenantId })

      const tenantPath = path.join(baseDataDir, 'tenants', tenantId)
      expect(fs.mkdir).toHaveBeenCalledWith(tenantPath, { recursive: true })
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(tenantPath, 'v1p1'), { recursive: true })
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(tenantPath, 'v1p0'), { recursive: true })
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(tenantPath, 'v1p1', 'indexes'), { recursive: true })
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(tenantPath, 'v1p0', 'indexes'), { recursive: true })
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(tenantPath, 'v1p1', 'frameworks'), { recursive: true })
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(tenantPath, 'v1p0', 'frameworks'), { recursive: true })
      expect(mockProvisioner.provisionTenant).toHaveBeenCalledWith(tenantId)
    })

    it('should create empty index files', async () => {
      const error = new Error('ENOENT')
      ;(error as any).code = 'ENOENT'
      ;(fs.stat as jest.Mock).mockRejectedValue(error)
      ;(fs.mkdir as jest.Mock).mockResolvedValue(undefined)
      ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)

      await createTenant.execute({ baseDataDir, tenantId })

      const indexFiles = ['documents.json', 'document-versions.json', 'items.json', 'associations.json']
      const tenantPath = path.join(baseDataDir, 'tenants', tenantId)

      for (const indexFile of indexFiles) {
        expect(fs.writeFile).toHaveBeenCalledWith(
          path.join(tenantPath, 'v1p1', 'indexes', indexFile),
          JSON.stringify([], null, 2),
          'utf8'
        )
        expect(fs.writeFile).toHaveBeenCalledWith(
          path.join(tenantPath, 'v1p0', 'indexes', indexFile),
          JSON.stringify([], null, 2),
          'utf8'
        )
      }
    })

    it('should throw error if tenant already exists', async () => {
      const mockStat = {
        isDirectory: () => true
      }
      ;(fs.stat as jest.Mock).mockResolvedValue(mockStat)

      await expect(
        createTenant.execute({ baseDataDir, tenantId })
      ).rejects.toThrow(`Tenant '${tenantId}' already exists`)
      expect(mockProvisioner.provisionTenant).not.toHaveBeenCalled()
    })

    it('should handle non-ENOENT errors from stat', async () => {
      const error = new Error('Permission denied')
      ;(fs.stat as jest.Mock).mockRejectedValue(error)

      await expect(
        createTenant.execute({ baseDataDir, tenantId })
      ).rejects.toThrow('Permission denied')
      expect(mockProvisioner.provisionTenant).not.toHaveBeenCalled()
    })

    it('should handle file creation errors', async () => {
      const error = new Error('ENOENT')
      ;(error as any).code = 'ENOENT'
      ;(fs.stat as jest.Mock).mockRejectedValue(error)
      ;(fs.mkdir as jest.Mock).mockResolvedValue(undefined)
      ;(fs.writeFile as jest.Mock).mockRejectedValue(new Error('Disk full'))

      await expect(
        createTenant.execute({ baseDataDir, tenantId })
      ).rejects.toThrow('Disk full')
      expect(mockProvisioner.provisionTenant).not.toHaveBeenCalled()
    })
  })
})













