import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import fs from 'node:fs/promises'
import path from 'node:path'

export interface DeleteCFDocumentCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: string
}

export class DeleteCFDocument {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (cmd: DeleteCFDocumentCommand): Promise<void> {
    const { tenantId, caseVersion, sourcedId } = cmd

    // Verify document exists
    const existingPkg = await this.pkgRepo.load(tenantId, caseVersion, sourcedId)
    if (!existingPkg) {
      throw new Error(`CFDocument with sourcedId ${sourcedId} not found`)
    }

    // Remove from in-memory indexes
    this.store.removeDocumentFromIndex(tenantId, caseVersion, sourcedId)

    // Remove items from index
    for (const item of existingPkg.items) {
      this.store.removeItemFromIndex(tenantId, caseVersion, item.sourcedId)
    }

    // Remove associations from index
    for (const assoc of existingPkg.associations) {
      this.store.removeAssociationFromIndex(tenantId, caseVersion, assoc.sourcedId)
    }

    // Remove rubrics from index
    for (const r of existingPkg.rubrics ?? []) {
      const rubricId = r.identifier
      if (rubricId) this.store.removeRubricFromIndex(tenantId, caseVersion, rubricId)
    }

    // Remove definitions from index (per-tenant defaults may have been sourced from this framework)
    this.store.removeDefinitionsFromIndexForDocument(tenantId, caseVersion, sourcedId)

    // Delete framework directory
    const rootDir = this.store.getTenantVersionRootDir(tenantId, caseVersion)
    const frameworksDir = path.join(rootDir, 'frameworks', sourcedId)
    try {
      await fs.rm(frameworksDir, { recursive: true, force: true })
    } catch (error: any) {
      // Ignore if directory doesn't exist
      if (error.code !== 'ENOENT') {
        throw error
      }
    }

    // Update index files on disk
    await this.store.writeIndexesToDisk(tenantId, caseVersion)
  }
}

