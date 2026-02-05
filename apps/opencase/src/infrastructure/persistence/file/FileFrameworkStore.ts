import fs from 'node:fs/promises'
import path from 'node:path'
import { type CaseVersion, type TenantId } from '../../../domain/case/value-objects/Identifiers'
import { logger } from '../../logging/Logger'

export interface FileFrameworkStoreConfig {
  baseDataDir: string
}

export interface DocumentMetadata {
  sourcedId: string
  title: string
  language?: string
  frameworkType?: string
  subject?: string
  version?: string
  lastChangeDateTime: Date
  currentFile: string // relative to tenant/version root
  adoptionStatus?: string // For filtering archived/retired documents
}

export interface DocumentVersionInfo {
  file: string
  lastChangeDateTime: Date
  version?: string
}

interface ItemIndexEntry {
  docSourcedId: string
}

interface AssocIndexEntry {
  docSourcedId: string
}

interface RubricIndexEntry {
  docSourcedId: string
}

type DefinitionCategory =
  | 'CFConcepts'
  | 'CFSubjects'
  | 'CFLicenses'
  | 'CFItemTypes'
  | 'CFAssociationGroupings'

interface DefinitionIndexEntry {
  docSourcedId: string
  value: any
  lastChangeDateTime?: string
}

export class FileFrameworkStore {
  private readonly documents = new Map<TenantId, Map<CaseVersion, Map<string, DocumentMetadata>>>()
  private readonly documentVersions = new Map<TenantId, Map<CaseVersion, Map<string, DocumentVersionInfo[]>>>()
  private readonly itemsIndex = new Map<TenantId, Map<CaseVersion, Map<string, ItemIndexEntry>>>()
  private readonly assocIndex = new Map<TenantId, Map<CaseVersion, Map<string, AssocIndexEntry>>>()
  private readonly rubricsIndex = new Map<TenantId, Map<CaseVersion, Map<string, RubricIndexEntry>>>()
  private readonly definitionsIndex = new Map<TenantId, Map<CaseVersion, Map<DefinitionCategory, Map<string, DefinitionIndexEntry>>>>()

  constructor (private readonly cfg: FileFrameworkStoreConfig) {}

  async loadAll (): Promise<void> {
    const tenantsDir = path.join(this.cfg.baseDataDir, 'tenants')
    let tenantNames: string[]
    try {
      tenantNames = await fs.readdir(tenantsDir)
    } catch {
      return
    }

    const versions: CaseVersion[] = ['1.0', '1.1']

    await Promise.all(
      tenantNames.map(async tenantId => {
        const tenantPath = path.join(tenantsDir, tenantId)
        const stat = await fs.stat(tenantPath)
        if (!stat.isDirectory()) return

        for (const version of versions) {
          const versionDir = path.join(tenantPath, version === '1.0' ? 'v1p0' : 'v1p1')
          await this.loadIndexesForTenantVersion(tenantId, version, versionDir)
        }
      })
    )
  }

  private async loadIndexesForTenantVersion (
    tenantId: TenantId,
    version: CaseVersion,
    versionDir: string
  ): Promise<void> {
    const idxDir = path.join(versionDir, 'indexes')
    const docsMap = await this.loadDocumentsIndex(idxDir)
    const versionsMap = await this.loadDocumentVersionsIndex(idxDir)
    const itemsMap = await this.loadItemsIndex(idxDir)
    const assocMap = await this.loadAssociationsIndex(idxDir)
    const rubricsMap = await this.loadRubricsIndex(idxDir)
    const defsMap = await this.loadDefinitionsIndex(idxDir)

    this.setTenantVersionMap(this.documents, tenantId, version, docsMap)
    this.setTenantVersionMap(this.documentVersions, tenantId, version, versionsMap)
    this.setTenantVersionMap(this.itemsIndex, tenantId, version, itemsMap)
    this.setTenantVersionMap(this.assocIndex, tenantId, version, assocMap)
    this.setTenantVersionMap(this.rubricsIndex, tenantId, version, rubricsMap)
    this.setTenantVersionMap(this.definitionsIndex, tenantId, version, defsMap)
  }

  private setTenantVersionMap<T>(
    root: Map<TenantId, Map<CaseVersion, Map<string, T>>>,
    tenantId: TenantId,
    version: CaseVersion,
    data: Map<string, T>
  ): void {
    let tenantMap = root.get(tenantId)
    if (!tenantMap) {
      tenantMap = new Map()
      root.set(tenantId, tenantMap)
    }
    tenantMap.set(version, data)
  }

  private async loadDocumentsIndex (idxDir: string): Promise<Map<string, DocumentMetadata>> {
    const map = new Map<string, DocumentMetadata>()
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'documents.json'), 'utf8')
      ) as any[]
      for (const d of raw) {
        map.set(d.sourcedId as string, {
          sourcedId: d.sourcedId,
          title: d.title,
          language: d.language,
          frameworkType: d.frameworkType,
          subject: d.subject,
          version: d.version,
          lastChangeDateTime: new Date(d.lastChangeDateTime as string | number | Date),
          currentFile: d.currentFile,
          adoptionStatus: d.adoptionStatus
        })
      }
    } catch {
      // ignore missing
    }
    return map
  }

  private async loadDocumentVersionsIndex (
    idxDir: string
  ): Promise<Map<string, DocumentVersionInfo[]>> {
    const map = new Map<string, DocumentVersionInfo[]>()
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'document-versions.json'), 'utf8')
      ) as Record<string, any[]>
      for (const [docId, versions] of Object.entries(raw)) {
        map.set(
          docId,
          versions.map(v => ({
            file: v.file,
            lastChangeDateTime: new Date(v.lastChangeDateTime as string | number | Date),
            version: v.version
          }))
        )
      }
    } catch {
      // ignore missing
    }
    return map
  }

  private async loadItemsIndex (idxDir: string): Promise<Map<string, ItemIndexEntry>> {
    const map = new Map<string, ItemIndexEntry>()
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'items.json'), 'utf8')
      ) as Record<string, { docSourcedId: string }>
      for (const [itemId, v] of Object.entries(raw)) {
        map.set(itemId, { docSourcedId: v.docSourcedId })
      }
    } catch {
      // ignore missing
    }
    return map
  }

  private async loadAssociationsIndex (idxDir: string): Promise<Map<string, AssocIndexEntry>> {
    const map = new Map<string, AssocIndexEntry>()
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'associations.json'), 'utf8')
      ) as Record<string, { docSourcedId: string }>
      for (const [assocId, v] of Object.entries(raw)) {
        map.set(assocId, { docSourcedId: v.docSourcedId })
      }
    } catch {
      // ignore missing
    }
    return map
  }

  private async loadRubricsIndex (idxDir: string): Promise<Map<string, RubricIndexEntry>> {
    const map = new Map<string, RubricIndexEntry>()
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'rubrics.json'), 'utf8')
      ) as Record<string, { docSourcedId: string }>
      for (const [rubricId, v] of Object.entries(raw)) {
        map.set(rubricId, { docSourcedId: v.docSourcedId })
      }
    } catch {
      // ignore missing
    }
    return map
  }

  private async loadDefinitionsIndex (
    idxDir: string
  ): Promise<Map<DefinitionCategory, Map<string, DefinitionIndexEntry>>> {
    const result = new Map<DefinitionCategory, Map<string, DefinitionIndexEntry>>()
    const categories: DefinitionCategory[] = ['CFConcepts', 'CFSubjects', 'CFLicenses', 'CFItemTypes', 'CFAssociationGroupings']
    for (const c of categories) result.set(c, new Map())

    try {
      const raw = JSON.parse(await fs.readFile(path.join(idxDir, 'definitions.json'), 'utf8')) as any
      for (const c of categories) {
        const entries = raw?.[c]
        if (!entries || typeof entries !== 'object') continue
        const map = result.get(c)!
        for (const [id, entry] of Object.entries(entries)) {
          if (!entry || typeof entry !== 'object') continue
          map.set(id, entry as DefinitionIndexEntry)
        }
      }
    } catch {
      // ignore missing
    }
    return result
  }

  getTenantVersionRootDir (tenantId: TenantId, version: CaseVersion): string {
    const tenantDir = path.join(this.cfg.baseDataDir, 'tenants', tenantId)
    const vDir = version === '1.0' ? 'v1p0' : 'v1p1'
    return path.join(tenantDir, vDir)
  }

  async loadDocumentBundle (
    tenantId: TenantId,
    version: CaseVersion,
    docId: string
  ): Promise<{ document: any, items?: any[], associations?: any[], rubrics?: any[], definitions?: any } | null> {
    logger.info({ tenantId, version, docId }, 'loadDocumentBundle')
    const meta = this.documents.get(tenantId)?.get(version)?.get(docId)
    if (!meta) return null
    logger.info({ meta }, 'meta')
    const rootDir = this.getTenantVersionRootDir(tenantId, version)
    const fullPath = path.join(rootDir, meta.currentFile)
    const json = JSON.parse(await fs.readFile(fullPath, 'utf8'))
    return json
  }

  async writeBundleFile (
    tenantId: TenantId,
    version: CaseVersion,
    docId: string,
    bundle: any
  ): Promise<{ relativePath: string }> {
    const rootDir = this.getTenantVersionRootDir(tenantId, version)
    const frameworksDir = path.join(rootDir, 'frameworks', docId)
    await fs.mkdir(frameworksDir, { recursive: true })

    const existing = await fs.readdir(frameworksDir).catch(() => [])
    const nextVersion = existing.length + 1
    const versionLabel = String(nextVersion).padStart(4, '0')
    const fileName = `${docId}_v${versionLabel}.json`
    const fullPath = path.join(frameworksDir, fileName)
    const relativePath = path.relative(rootDir, fullPath)

    await fs.writeFile(fullPath, JSON.stringify(bundle, null, 2), 'utf8')

    return { relativePath }
  }

  async updateIndexesForBundle (
    tenantId: TenantId,
    version: CaseVersion,
    bundle: {
      document: any
      items?: any[]
      associations?: any[]
      rubrics?: any[]
    },
    relativePath: string
  ): Promise<void> {
    const rootDir = this.getTenantVersionRootDir(tenantId, version)
    const idxDir = path.join(rootDir, 'indexes')
    await fs.mkdir(idxDir, { recursive: true })

    const doc = bundle.document
    const docId = (doc.sourcedId ?? doc.identifier) as string
    const lastChangeDateTime = new Date(doc.lastChangeDateTime as string | number | Date)

    // Update in-memory indexes
    this.updateInMemoryDocumentIndex(tenantId, version, docId, doc, relativePath)
    this.updateInMemoryDocumentVersionsIndex(tenantId, version, docId, relativePath, lastChangeDateTime, doc.version as string | undefined)
    this.updateInMemoryItemsIndex(tenantId, version, bundle.items ?? [], docId)
    this.updateInMemoryAssociationsIndex(tenantId, version, bundle.associations ?? [], docId)
    this.updateInMemoryRubricsIndex(tenantId, version, (bundle as any).rubrics ?? [], docId)
    this.updateInMemoryDefinitionsIndex(tenantId, version, (bundle as any).definitions, docId, lastChangeDateTime)

    // Write index files to disk
    await this.writeDocumentsIndex(idxDir, tenantId, version)
    await this.writeDocumentVersionsIndex(idxDir, tenantId, version)
    await this.writeItemsIndex(idxDir, tenantId, version)
    await this.writeAssociationsIndex(idxDir, tenantId, version)
    await this.writeRubricsIndex(idxDir, tenantId, version)
    await this.writeDefinitionsIndex(idxDir, tenantId, version)
  }

  private updateInMemoryDocumentIndex (
    tenantId: TenantId,
    version: CaseVersion,
    docId: string,
    doc: any,
    relativePath: string
  ): void {
    let tenantMap = this.documents.get(tenantId)
    if (!tenantMap) {
      tenantMap = new Map()
      this.documents.set(tenantId, tenantMap)
    }
    let versionMap = tenantMap.get(version)
    if (!versionMap) {
      versionMap = new Map()
      tenantMap.set(version, versionMap)
    }

    versionMap.set(docId, {
      sourcedId: docId,
      title: doc.title as string,
      language: doc.language as string | undefined,
      frameworkType: doc.frameworkType as string | undefined,
      subject: doc.subject as string | undefined,
      version: doc.version as string | undefined,
      lastChangeDateTime: new Date(doc.lastChangeDateTime as string | number | Date),
      currentFile: relativePath,
      adoptionStatus: doc.adoptionStatus as string | undefined
    })
  }

  private updateInMemoryDocumentVersionsIndex (
    tenantId: TenantId,
    version: CaseVersion,
    docId: string,
    relativePath: string,
    lastChangeDateTime: Date,
    docVersion?: string
  ): void {
    let tenantMap = this.documentVersions.get(tenantId)
    if (!tenantMap) {
      tenantMap = new Map()
      this.documentVersions.set(tenantId, tenantMap)
    }
    let versionMap = tenantMap.get(version)
    if (!versionMap) {
      versionMap = new Map()
      tenantMap.set(version, versionMap)
    }

    const versions = versionMap.get(docId) ?? []
    versions.push({
      file: relativePath,
      lastChangeDateTime,
      version: docVersion
    })
    versionMap.set(docId, versions)
  }

  private updateInMemoryItemsIndex (
    tenantId: TenantId,
    version: CaseVersion,
    items: any[],
    docId: string
  ): void {
    let tenantMap = this.itemsIndex.get(tenantId)
    if (!tenantMap) {
      tenantMap = new Map()
      this.itemsIndex.set(tenantId, tenantMap)
    }
    let versionMap = tenantMap.get(version)
    if (!versionMap) {
      versionMap = new Map()
      tenantMap.set(version, versionMap)
    }

    // Clear existing items for this doc to avoid stale entries when a new version removes items.
    for (const [itemId, entry] of versionMap.entries()) {
      if (entry.docSourcedId === docId) versionMap.delete(itemId)
    }

    for (const item of items) {
      const itemId = (item.sourcedId ?? item.identifier) as string | undefined
      if (itemId) {
        versionMap.set(itemId, { docSourcedId: docId })
      }
    }
  }

  private updateInMemoryAssociationsIndex (
    tenantId: TenantId,
    version: CaseVersion,
    associations: any[],
    docId: string
  ): void {
    let tenantMap = this.assocIndex.get(tenantId)
    if (!tenantMap) {
      tenantMap = new Map()
      this.assocIndex.set(tenantId, tenantMap)
    }
    let versionMap = tenantMap.get(version)
    if (!versionMap) {
      versionMap = new Map()
      tenantMap.set(version, versionMap)
    }

    // Clear existing associations for this doc to avoid stale entries when a new version removes associations.
    for (const [assocId, entry] of versionMap.entries()) {
      if (entry.docSourcedId === docId) versionMap.delete(assocId)
    }

    for (const assoc of associations) {
      const assocId = (assoc.sourcedId ?? assoc.identifier) as string | undefined
      if (assocId) {
        versionMap.set(assocId, { docSourcedId: docId })
      }
    }
  }

  private updateInMemoryRubricsIndex (
    tenantId: TenantId,
    version: CaseVersion,
    rubrics: any[],
    docId: string
  ): void {
    let tenantMap = this.rubricsIndex.get(tenantId)
    if (!tenantMap) {
      tenantMap = new Map()
      this.rubricsIndex.set(tenantId, tenantMap)
    }
    let versionMap = tenantMap.get(version)
    if (!versionMap) {
      versionMap = new Map()
      tenantMap.set(version, versionMap)
    }

    // Clear existing rubrics for this doc (new version may remove rubrics).
    for (const [rubricId, entry] of versionMap.entries()) {
      if (entry.docSourcedId === docId) versionMap.delete(rubricId)
    }

    for (const r of rubrics ?? []) {
      const rubricId = (r?.identifier ?? r?.id ?? r?.sourcedId) as string | undefined
      if (rubricId) {
        versionMap.set(rubricId, { docSourcedId: docId })
      }
    }
  }

  private updateInMemoryDefinitionsIndex (
    tenantId: TenantId,
    version: CaseVersion,
    definitions: any,
    docId: string,
    lastChangeDateTime: Date
  ): void {
    if (!definitions) return

    let tenantMap = this.definitionsIndex.get(tenantId)
    if (!tenantMap) {
      tenantMap = new Map()
      this.definitionsIndex.set(tenantId, tenantMap)
    }
    let versionMap = tenantMap.get(version)
    if (!versionMap) {
      versionMap = new Map()
      tenantMap.set(version, versionMap)
    }

    const upsertCategory = (category: DefinitionCategory, list: any[] | undefined) => {
      if (!Array.isArray(list)) return
      let catMap = versionMap!.get(category)
      if (!catMap) {
        catMap = new Map()
        versionMap!.set(category, catMap)
      }
      for (const v of list) {
        const id = (v?.identifier ?? v?.sourcedId) as string | undefined
        if (!id) continue
        // "Per-tenant defaults": if duplicates exist across docs, keep latest change as default.
        const existing = catMap.get(id)
        const incoming: DefinitionIndexEntry = { docSourcedId: docId, value: v, lastChangeDateTime: lastChangeDateTime.toISOString() }
        if (!existing) {
          catMap.set(id, incoming)
          continue
        }
        const existingTs = existing.lastChangeDateTime ? Date.parse(existing.lastChangeDateTime) : 0
        const incomingTs = Date.parse(incoming.lastChangeDateTime!)
        if (incomingTs >= existingTs) {
          catMap.set(id, incoming)
        }
      }
    }

    upsertCategory('CFConcepts', definitions.CFConcepts)
    upsertCategory('CFSubjects', definitions.CFSubjects)
    upsertCategory('CFLicenses', definitions.CFLicenses)
    upsertCategory('CFItemTypes', definitions.CFItemTypes)
    upsertCategory('CFAssociationGroupings', definitions.CFAssociationGroupings)
  }

  private async writeDocumentsIndex (
    idxDir: string,
    tenantId: TenantId,
    version: CaseVersion
  ): Promise<void> {
    const versionMap = this.documents.get(tenantId)?.get(version)
    if (!versionMap) return

    const documents = Array.from(versionMap.values()).map(meta => ({
      sourcedId: meta.sourcedId,
      title: meta.title,
      language: meta.language,
      frameworkType: meta.frameworkType,
      subject: meta.subject,
      version: meta.version,
      lastChangeDateTime: meta.lastChangeDateTime.toISOString(),
      currentFile: meta.currentFile,
      adoptionStatus: meta.adoptionStatus
    }))

    await fs.writeFile(
      path.join(idxDir, 'documents.json'),
      JSON.stringify(documents, null, 2),
      'utf8'
    )
  }

  private async writeDocumentVersionsIndex (
    idxDir: string,
    tenantId: TenantId,
    version: CaseVersion
  ): Promise<void> {
    const versionMap = this.documentVersions.get(tenantId)?.get(version)
    if (!versionMap) return

    const versions: Record<string, any[]> = {}
    for (const [docId, vers] of versionMap.entries()) {
      versions[docId] = vers.map(v => ({
        file: v.file,
        lastChangeDateTime: v.lastChangeDateTime.toISOString(),
        version: v.version
      }))
    }

    await fs.writeFile(
      path.join(idxDir, 'document-versions.json'),
      JSON.stringify(versions, null, 2),
      'utf8'
    )
  }

  private async writeItemsIndex (
    idxDir: string,
    tenantId: TenantId,
    version: CaseVersion
  ): Promise<void> {
    const versionMap = this.itemsIndex.get(tenantId)?.get(version)
    if (!versionMap) return

    const items: Record<string, { docSourcedId: string }> = {}
    for (const [itemId, entry] of versionMap.entries()) {
      items[itemId] = { docSourcedId: entry.docSourcedId }
    }

    await fs.writeFile(
      path.join(idxDir, 'items.json'),
      JSON.stringify(items, null, 2),
      'utf8'
    )
  }

  private async writeAssociationsIndex (
    idxDir: string,
    tenantId: TenantId,
    version: CaseVersion
  ): Promise<void> {
    const versionMap = this.assocIndex.get(tenantId)?.get(version)
    if (!versionMap) return

    const associations: Record<string, { docSourcedId: string }> = {}
    for (const [assocId, entry] of versionMap.entries()) {
      associations[assocId] = { docSourcedId: entry.docSourcedId }
    }

    await fs.writeFile(
      path.join(idxDir, 'associations.json'),
      JSON.stringify(associations, null, 2),
      'utf8'
    )
  }

  private async writeRubricsIndex (
    idxDir: string,
    tenantId: TenantId,
    version: CaseVersion
  ): Promise<void> {
    const versionMap = this.rubricsIndex.get(tenantId)?.get(version)
    if (!versionMap) return

    const rubrics: Record<string, { docSourcedId: string }> = {}
    for (const [rubricId, entry] of versionMap.entries()) {
      rubrics[rubricId] = { docSourcedId: entry.docSourcedId }
    }

    await fs.writeFile(
      path.join(idxDir, 'rubrics.json'),
      JSON.stringify(rubrics, null, 2),
      'utf8'
    )
  }

  private async writeDefinitionsIndex (
    idxDir: string,
    tenantId: TenantId,
    version: CaseVersion
  ): Promise<void> {
    const versionMap = this.definitionsIndex.get(tenantId)?.get(version)
    if (!versionMap) return

    const out: any = {}
    for (const [category, catMap] of versionMap.entries()) {
      out[category] = {}
      for (const [id, entry] of catMap.entries()) {
        out[category][id] = entry
      }
    }

    await fs.writeFile(
      path.join(idxDir, 'definitions.json'),
      JSON.stringify(out, null, 2),
      'utf8'
    )
  }

  // Helper methods for accessing indexes
  getDocumentIdForItem (tenantId: TenantId, version: CaseVersion, itemId: string): string | null {
    const entry = this.itemsIndex.get(tenantId)?.get(version)?.get(itemId)
    return entry?.docSourcedId ?? null
  }

  getDocumentIdForAssociation (tenantId: TenantId, version: CaseVersion, assocId: string): string | null {
    const entry = this.assocIndex.get(tenantId)?.get(version)?.get(assocId)
    return entry?.docSourcedId ?? null
  }

  documentExists (tenantId: TenantId, version: CaseVersion, docId: string): boolean {
    return Boolean(this.documents.get(tenantId)?.get(version)?.get(docId))
  }

  itemExists (tenantId: TenantId, version: CaseVersion, itemId: string): boolean {
    return Boolean(this.itemsIndex.get(tenantId)?.get(version)?.get(itemId))
  }

  associationExists (tenantId: TenantId, version: CaseVersion, assocId: string): boolean {
    return Boolean(this.assocIndex.get(tenantId)?.get(version)?.get(assocId))
  }

  getAllDocuments (tenantId: TenantId, version: CaseVersion): DocumentMetadata[] {
    const versionMap = this.documents.get(tenantId)?.get(version)
    if (!versionMap) return []
    return Array.from(versionMap.values())
  }

  // Public methods for index management (used by management endpoints)
  removeDocumentFromIndex (tenantId: TenantId, version: CaseVersion, docId: string): void {
    const tenantMap = this.documents.get(tenantId)
    const versionMap = tenantMap?.get(version)
    if (versionMap) {
      versionMap.delete(docId)
    }

    const versionsMap = this.documentVersions.get(tenantId)?.get(version)
    if (versionsMap) {
      versionsMap.delete(docId)
    }
  }

  removeItemFromIndex (tenantId: TenantId, version: CaseVersion, itemId: string): void {
    const tenantMap = this.itemsIndex.get(tenantId)
    const versionMap = tenantMap?.get(version)
    if (versionMap) {
      versionMap.delete(itemId)
    }
  }

  removeAssociationFromIndex (tenantId: TenantId, version: CaseVersion, assocId: string): void {
    const tenantMap = this.assocIndex.get(tenantId)
    const versionMap = tenantMap?.get(version)
    if (versionMap) {
      versionMap.delete(assocId)
    }
  }

  removeRubricFromIndex (tenantId: TenantId, version: CaseVersion, rubricId: string): void {
    const tenantMap = this.rubricsIndex.get(tenantId)
    const versionMap = tenantMap?.get(version)
    if (versionMap) {
      versionMap.delete(rubricId)
    }
  }

  removeDefinitionsFromIndexForDocument (tenantId: TenantId, version: CaseVersion, docId: string): void {
    const versionMap = this.definitionsIndex.get(tenantId)?.get(version)
    if (!versionMap) return

    for (const [, catMap] of versionMap.entries()) {
      for (const [id, entry] of catMap.entries()) {
        if (entry.docSourcedId === docId) {
          catMap.delete(id)
        }
      }
    }
  }

  async writeIndexesToDisk (tenantId: TenantId, version: CaseVersion): Promise<void> {
    const rootDir = this.getTenantVersionRootDir(tenantId, version)
    const idxDir = path.join(rootDir, 'indexes')
    await fs.mkdir(idxDir, { recursive: true })
    await this.writeDocumentsIndex(idxDir, tenantId, version)
    await this.writeDocumentVersionsIndex(idxDir, tenantId, version)
    await this.writeItemsIndex(idxDir, tenantId, version)
    await this.writeAssociationsIndex(idxDir, tenantId, version)
    await this.writeRubricsIndex(idxDir, tenantId, version)
    await this.writeDefinitionsIndex(idxDir, tenantId, version)
  }

  /**
   * Guard against accidental GUID reuse across different frameworks (docs/items/associations/rubrics).
   * Note: definition IDs are intentionally reusable (per-tenant defaults) so they are not enforced here.
   */
  assertNoEntityIdReuse (
    tenantId: TenantId,
    version: CaseVersion,
    docId: string,
    bundle: { document: any, items?: any[], associations?: any[], rubrics?: any[] }
  ): void {
    const ids = new Map<string, string>() // id -> kind

    const add = (id: string | undefined, kind: string) => {
      if (!id) return
      const existing = ids.get(id)
      if (existing && existing !== kind) {
        throw new Error(`ID reuse detected within bundle: '${id}' is used as both ${existing} and ${kind}`)
      }
      ids.set(id, kind)
    }

    add(docId, 'CFDocument')
    for (const it of bundle.items ?? []) add((it?.sourcedId ?? it?.identifier) as string | undefined, 'CFItem')
    for (const a of bundle.associations ?? []) add((a?.sourcedId ?? a?.identifier) as string | undefined, 'CFAssociation')
    for (const r of bundle.rubrics ?? []) {
      // Handle both CFRubric entities and raw objects
      const rubricId = (r as any)?.identifier ?? (r as any)?.id ?? (r as any)?.sourcedId
      add(rubricId as string | undefined, 'CFRubric')
    }

    const other = version === '1.1' ? '1.0' : '1.1'

    const itemsMap = this.itemsIndex.get(tenantId)?.get(version) ?? new Map()
    const assocMap = this.assocIndex.get(tenantId)?.get(version) ?? new Map()
    const rubricsMap = this.rubricsIndex.get(tenantId)?.get(version) ?? new Map()
    const docsMap = this.documents.get(tenantId)?.get(version) ?? new Map()

    const itemsMapOther = this.itemsIndex.get(tenantId)?.get(other) ?? new Map()
    const assocMapOther = this.assocIndex.get(tenantId)?.get(other) ?? new Map()
    const rubricsMapOther = this.rubricsIndex.get(tenantId)?.get(other) ?? new Map()
    const docsMapOther = this.documents.get(tenantId)?.get(other) ?? new Map()

    // Disallow creating the "same" document id in the other CASE partition.
    // This keeps framework identity consistent irrespective of CASE version.
    if (docsMapOther.get(docId)) {
      throw new Error(`CFDocument id '${docId}' already exists in CASE ${other}; cannot create it again in CASE ${version}`)
    }

    for (const [id, kind] of ids.entries()) {
      if (kind === 'CFDocument') {
        // Allowed: docId already exists (publishing new version).
        // Disallowed: docId is used by any other entity.
        if (itemsMap.get(id) || assocMap.get(id) || rubricsMap.get(id) || itemsMapOther.get(id) || assocMapOther.get(id) || rubricsMapOther.get(id)) {
          throw new Error(`ID '${id}' is already used by another entity and cannot be used as a CFDocument id`)
        }
        continue
      }

      // Prevent collisions with document IDs
      if (docsMap.get(id) || docsMapOther.get(id)) {
        throw new Error(`ID '${id}' is already used as a CFDocument id and cannot be reused for ${kind}`)
      }

      if (kind === 'CFItem') {
        const existing = itemsMap.get(id) ?? itemsMapOther.get(id)
        if (existing && (existing as any).docSourcedId !== docId) {
          throw new Error(`CFItem id '${id}' is already used in a different framework (docId=${(existing as any).docSourcedId})`)
        }
        if (assocMap.get(id) || assocMapOther.get(id)) throw new Error(`ID '${id}' is already used as a CFAssociation id and cannot be reused for CFItem`)
        if (rubricsMap.get(id) || rubricsMapOther.get(id)) throw new Error(`ID '${id}' is already used as a CFRubric id and cannot be reused for CFItem`)
      }

      if (kind === 'CFAssociation') {
        const existing = assocMap.get(id) ?? assocMapOther.get(id)
        if (existing && (existing as any).docSourcedId !== docId) {
          throw new Error(`CFAssociation id '${id}' is already used in a different framework (docId=${(existing as any).docSourcedId})`)
        }
        if (itemsMap.get(id) || itemsMapOther.get(id)) throw new Error(`ID '${id}' is already used as a CFItem id and cannot be reused for CFAssociation`)
        if (rubricsMap.get(id) || rubricsMapOther.get(id)) throw new Error(`ID '${id}' is already used as a CFRubric id and cannot be reused for CFAssociation`)
      }

      if (kind === 'CFRubric') {
        const existing = rubricsMap.get(id) ?? rubricsMapOther.get(id)
        if (existing && (existing as any).docSourcedId !== docId) {
          throw new Error(`CFRubric id '${id}' is already used in a different framework (docId=${(existing as any).docSourcedId})`)
        }
        if (itemsMap.get(id) || itemsMapOther.get(id)) throw new Error(`ID '${id}' is already used as a CFItem id and cannot be reused for CFRubric`)
        if (assocMap.get(id) || assocMapOther.get(id)) throw new Error(`ID '${id}' is already used as a CFAssociation id and cannot be reused for CFRubric`)
      }
    }
  }

  getDefinitionById (
    tenantId: TenantId,
    version: CaseVersion,
    category: DefinitionCategory,
    id: string
  ): DefinitionIndexEntry | null {
    return this.definitionsIndex.get(tenantId)?.get(version)?.get(category)?.get(id) ?? null
  }

  getTenantDefinitions (
    tenantId: TenantId,
    version: CaseVersion
  ): Record<DefinitionCategory, any[]> {
    const categories: DefinitionCategory[] = ['CFConcepts', 'CFSubjects', 'CFLicenses', 'CFItemTypes', 'CFAssociationGroupings']
    const versionMap = this.definitionsIndex.get(tenantId)?.get(version)
    const result: any = {}
    for (const c of categories) {
      const catMap = versionMap?.get(c)
      result[c] = catMap ? Array.from(catMap.values()).map(e => e.value) : []
    }
    return result
  }
}
