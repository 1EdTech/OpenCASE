import type { CFPackageRepository } from '../ports/CFPackageRepository'
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers'
import { CFDocument } from '../../../domain/case/entities/CFDocument'
import { CFPackage } from '../../../domain/case/entities/CFPackage'
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

    // Verify document exists
    const existingPkg = await this.pkgRepo.load(tenantId, caseVersion, sourcedId)
    if (!existingPkg) {
      throw new Error(`CFDocument with sourcedId ${sourcedId} not found`)
    }

    if (hardDelete) {
      // Hard delete: remove from indexes and delete files
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
    } else {
      // Soft delete (archive): update adoptionStatus to "Retired" and set statusEndDate
      // Check if already archived
      const currentStatus = existingPkg.document.toJSON().adoptionStatus
      if (currentStatus === 'Retired' || currentStatus === 'Deprecated') {
        // Already archived, nothing to do
        return
      }

      const docJSON = existingPkg.document.toJSON()
      const today = new Date().toISOString().split('T')[0] // ISO date format (YYYY-MM-DD)
      
      // Create updated document with Retired status
      const updatedDocument = CFDocument.fromRaw(tenantId, caseVersion, {
        ...docJSON,
        adoptionStatus: 'Retired',
        statusEndDate: docJSON.statusEndDate || today,
        lastChangeDateTime: new Date().toISOString()
      })

      // Create updated package with archived document
      const archivedPkg = new CFPackage({
        document: updatedDocument,
        items: existingPkg.items,
        associations: existingPkg.associations,
        rubrics: existingPkg.rubrics,
        definitions: existingPkg.definitions,
        extensions: existingPkg.extensions
      })

      // Save the archived version
      await this.pkgRepo.saveNewVersion(tenantId, caseVersion, archivedPkg)
    }
  }
}

