import fs from 'node:fs/promises'
import path from 'node:path'
import { logger } from '../../../infrastructure/logging/Logger'

export interface ListTenantsQuery {
  baseDataDir: string
}

export class ListTenants {
  async execute (query: ListTenantsQuery) {
    logger.info({ baseDataDir: query.baseDataDir }, 'Executing ListTenants')

    const tenantsDir = path.join(query.baseDataDir, 'tenants')
    let tenantNames: string[]
    
    try {
      const entries = await fs.readdir(tenantsDir, { withFileTypes: true })
      tenantNames = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { tenants: [], total: 0 }
      }
      throw error
    }

    // Get additional info for each tenant
    const tenants = await Promise.all(
      tenantNames.map(async (tenantId) => {
        const tenantPath = path.join(tenantsDir, tenantId)
        let hasFrameworks = false
        
        try {
          // A tenant "has frameworks" only if at least one framework exists under v1p0/v1p1 frameworks/
          const hasFrameworksInVersion = async (versionDirName: 'v1p0' | 'v1p1'): Promise<boolean> => {
            const frameworksDir = path.join(tenantPath, versionDirName, 'frameworks')
            try {
              const entries = await fs.readdir(frameworksDir, { withFileTypes: true })
              return entries.some(e => e.isDirectory())
            } catch {
              return false
            }
          }

          const [v1p1Has, v1p0Has] = await Promise.all([
            hasFrameworksInVersion('v1p1'),
            hasFrameworksInVersion('v1p0')
          ])

          hasFrameworks = v1p1Has || v1p0Has
        } catch {
          // Ignore errors
        }

        return {
          tenantId,
          hasFrameworks
        }
      })
    )

    return {
      tenants,
      total: tenants.length
    }
  }
}













