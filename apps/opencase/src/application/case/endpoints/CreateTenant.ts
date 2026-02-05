import fs from 'node:fs/promises'
import path from 'node:path'
import { logger } from '../../../infrastructure/logging/Logger'

export interface CreateTenantCommand {
  baseDataDir: string
  tenantId: string
}

export interface CreateTenantResult {
  tenantId: string
  adminAccount: {
    email: string
    password: string
  }
}

export interface TenantProvisioner {
  provisionTenant: (tenantId: string) => Promise<{ adminEmail: string, adminPassword: string }>
}

export class CreateTenant {
  constructor(
    private readonly provisioner?: TenantProvisioner
  ) {}

  async execute (cmd: CreateTenantCommand): Promise<CreateTenantResult> {
    logger.info({ tenantId: cmd.tenantId }, 'Executing CreateTenant')

    const tenantsDir = path.join(cmd.baseDataDir, 'tenants')
    const tenantPath = path.join(tenantsDir, cmd.tenantId)

    // Check if tenant already exists
    try {
      const stat = await fs.stat(tenantPath)
      if (stat.isDirectory()) {
        throw new Error(`Tenant '${cmd.tenantId}' already exists`)
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }

    // Create tenant directory structure
    await fs.mkdir(tenantPath, { recursive: true })
    
    // Create version directories
    const v1p1Path = path.join(tenantPath, 'v1p1')
    const v1p0Path = path.join(tenantPath, 'v1p0')
    
    await fs.mkdir(v1p1Path, { recursive: true })
    await fs.mkdir(v1p0Path, { recursive: true })
    
    // Create indexes directories
    await fs.mkdir(path.join(v1p1Path, 'indexes'), { recursive: true })
    await fs.mkdir(path.join(v1p0Path, 'indexes'), { recursive: true })
    
    // Create frameworks directories
    await fs.mkdir(path.join(v1p1Path, 'frameworks'), { recursive: true })
    await fs.mkdir(path.join(v1p0Path, 'frameworks'), { recursive: true })

    // Initialize empty index files
    const indexFiles = ['documents.json', 'document-versions.json', 'items.json', 'associations.json']
    for (const indexFile of indexFiles) {
      await fs.writeFile(
        path.join(v1p1Path, 'indexes', indexFile),
        JSON.stringify([], null, 2),
        'utf8'
      )
      await fs.writeFile(
        path.join(v1p0Path, 'indexes', indexFile),
        JSON.stringify([], null, 2),
        'utf8'
      )
    }

    logger.info({ tenantId: cmd.tenantId }, 'Tenant created successfully')

    // Provision tenant auth + tenant-admin account (Keycloak)
    let adminAccount: { email: string; password: string } | undefined
    if (this.provisioner) {
      try {
        const provisioned = await this.provisioner.provisionTenant(cmd.tenantId)
        adminAccount = { email: provisioned.adminEmail, password: provisioned.adminPassword }
        logger.info({ tenantId: cmd.tenantId, email: adminAccount.email }, 'Tenant auth provisioned and admin account created')
      } catch (error: any) {
        logger.error({ tenantId: cmd.tenantId, error: error.message }, 'Failed to provision tenant auth; rolling back tenant directory')
        await fs.rm(tenantPath, { recursive: true, force: true }).catch(() => undefined)
        throw error
      }
    } else {
      throw new Error('Tenant provisioning is not configured')
    }

    const result: CreateTenantResult = {
      tenantId: cmd.tenantId,
      adminAccount: adminAccount || {
        email: `admin@${cmd.tenantId}.local`,
        password: '' // should not happen when provisioner is configured
      }
    }

    return result
  }
}

