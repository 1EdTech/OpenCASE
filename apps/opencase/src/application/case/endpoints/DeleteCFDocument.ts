import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import type { FileFrameworkStore } from '../../../infrastructure/persistence/file/FileFrameworkStore'
import fs from 'node:fs/promises'
import path from 'node:path'

export interface DeleteCFDocumentCommand {
  tenantId: TenantId
  caseVersion: CaseVersion
  sourcedId: string
  hardDelete?: boolean
}

export class DeleteCFDocument {
  constructor (
    private readonly pkgRepo: CFPackageRepository,
    private readonly store: FileFrameworkStore
  ) {}

  async execute (cmd: DeleteCFDocumentCommand): Promise<void> {
    const { tenantId, caseVersion, sourcedId, hardDelete } = cmd

    // Resolve the document's current identifier to its storage key ONCE —
    // every store/repository call below takes a storage key, never sourcedId.
    const storageKey = this.store.resolveStorageKey(tenantId, caseVersion, sourcedId)
    const existingPkg = storageKey ? await this.pkgRepo.load(tenantId, caseVersion, storageKey) : null
    if (!existingPkg || !storageKey) {
      throw new Error(`CFDocument with sourcedId ${sourcedId} not found`)
    }

    if (hardDelete) {
      // Hard delete: remove from indexes and delete files
      // Remove from in-memory indexes
      this.store.removeDocumentFromIndex(tenantId, caseVersion, storageKey)

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
      this.store.removeDefinitionsFromIndexForDocument(tenantId, caseVersion, storageKey)

      // Delete framework directory
      const rootDir = this.store.getTenantVersionRootDir(tenantId, caseVersion)
      const frameworksDir = path.join(rootDir, 'frameworks', storageKey)
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
    } else {
      // Soft delete (archive): set the server-level archived flag.
      // This does NOT touch adoptionStatus or any CASE domain content.
      if (this.store.isDocumentArchived(tenantId, caseVersion, storageKey)) {
        // Already archived, nothing to do
        return
      }

      this.store.setDocumentArchived(tenantId, caseVersion, storageKey, true)
      await this.store.writeIndexesToDisk(tenantId, caseVersion)
    }
  }
}

