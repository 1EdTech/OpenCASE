import { ListTenants } from '../ListTenants'
import fs from 'node:fs/promises'
import path from 'node:path'

jest.mock('node:fs/promises')

describe('ListTenants', () => {
  let listTenants: ListTenants

  beforeEach(() => {
    listTenants = new ListTenants()
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const baseDataDir = '/test/data'

    it('should list all tenants', async () => {
      const mockTenants = [
        { name: 'tenant1', isDirectory: () => true },
        { name: 'tenant2', isDirectory: () => true },
        { name: 'tenant3', isDirectory: () => true }
      ]

      ;(fs.readdir as jest.Mock).mockResolvedValue(mockTenants)
      ;(fs.readdir as jest.Mock).mockImplementation((p: string) => {
        // First call (tenantsDir) returns tenants list; subsequent calls return "has frameworks"
        if (p === path.join(baseDataDir, 'tenants')) return Promise.resolve(mockTenants)
        return Promise.resolve([{ name: 'doc-1', isDirectory: () => true }])
      })

      const result = await listTenants.execute({ baseDataDir })

      expect(fs.readdir).toHaveBeenCalledWith(
        path.join(baseDataDir, 'tenants'),
        { withFileTypes: true }
      )
      expect(result.tenants).toHaveLength(3)
      expect(result.total).toBe(3)
      expect(result.tenants[0].tenantId).toBe('tenant1')
      expect(result.tenants[0].hasFrameworks).toBe(true)
    })

    it('should return empty array when tenants directory does not exist', async () => {
      const error = new Error('ENOENT')
      ;(error as any).code = 'ENOENT'
      ;(fs.readdir as jest.Mock).mockRejectedValue(error)

      const result = await listTenants.execute({ baseDataDir })

      expect(result.tenants).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should filter out non-directory entries', async () => {
      const mockEntries = [
        { name: 'tenant1', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
        { name: 'tenant2', isDirectory: () => true }
      ]

      ;(fs.readdir as jest.Mock).mockImplementation((p: string) => {
        if (p === path.join(baseDataDir, 'tenants')) return Promise.resolve(mockEntries)
        return Promise.resolve([{ name: 'doc-1', isDirectory: () => true }])
      })

      const result = await listTenants.execute({ baseDataDir })

      expect(result.tenants).toHaveLength(2)
      expect(result.tenants.map(t => t.tenantId)).toEqual(['tenant1', 'tenant2'])
    })

    it('should detect tenants with frameworks', async () => {
      const mockTenants = [
        { name: 'tenant-with-frameworks', isDirectory: () => true },
        { name: 'tenant-empty', isDirectory: () => true }
      ]

      ;(fs.readdir as jest.Mock).mockResolvedValue(mockTenants)
      
      // Mock fs.readdir for frameworks directories.
      const enoent = new Error('ENOENT')
      ;(enoent as any).code = 'ENOENT'

      ;(fs.readdir as jest.Mock).mockImplementation((p: string, _opts?: any) => {
        if (p === path.join(baseDataDir, 'tenants')) return Promise.resolve(mockTenants)
        if (p.includes('tenant-with-frameworks') && p.endsWith(path.join('v1p1', 'frameworks'))) {
          return Promise.resolve([{ name: 'doc-1', isDirectory: () => true }])
        }
        if (p.includes('tenant-empty') && p.endsWith(path.join('v1p1', 'frameworks'))) {
          return Promise.resolve([]) // exists but empty
        }
        // all other frameworks dirs missing
        return Promise.reject(enoent)
      })

      const result = await listTenants.execute({ baseDataDir })

      expect(result.tenants[0].hasFrameworks).toBe(true)
      expect(result.tenants[1].hasFrameworks).toBe(false)
    })

    it('should handle errors when checking framework directories', async () => {
      const mockTenants = [
        { name: 'tenant1', isDirectory: () => true }
      ]

      ;(fs.readdir as jest.Mock).mockResolvedValue(mockTenants)
      ;(fs.readdir as jest.Mock).mockImplementation((p: string, _opts?: any) => {
        if (p === path.join(baseDataDir, 'tenants')) return Promise.resolve(mockTenants)
        return Promise.reject(new Error('Permission denied'))
      })

      const result = await listTenants.execute({ baseDataDir })

      // Should still return tenant but with hasFrameworks = false due to error
      expect(result.tenants).toHaveLength(1)
      expect(result.tenants[0].hasFrameworks).toBe(false)
    })

    it('should propagate non-ENOENT errors', async () => {
      const error = new Error('Permission denied')
      ;(fs.readdir as jest.Mock).mockRejectedValue(error)

      await expect(
        listTenants.execute({ baseDataDir })
      ).rejects.toThrow('Permission denied')
    })
  })
})

