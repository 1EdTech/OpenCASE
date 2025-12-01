import fs from 'node:fs/promises';
import path from 'node:path';
import { CaseVersion, TenantId } from '../../../domain/case/value-objects/Identifiers';

export interface FileFrameworkStoreConfig {
  baseDataDir: string;
}

export interface DocumentMetadata {
  sourcedId: string;
  title: string;
  language?: string;
  frameworkType?: string;
  subject?: string;
  version?: string;
  lastChangeDateTime: Date;
  currentFile: string; // relative to tenant/version root
}

export interface DocumentVersionInfo {
  file: string;
  lastChangeDateTime: Date;
  version?: string;
}

interface ItemIndexEntry {
  docSourcedId: string;
}

interface AssocIndexEntry {
  docSourcedId: string;
}

export class FileFrameworkStore {
  private documents = new Map<TenantId, Map<CaseVersion, Map<string, DocumentMetadata>>>();
  private documentVersions = new Map<TenantId, Map<CaseVersion, Map<string, DocumentVersionInfo[]>>>();
  private itemsIndex = new Map<TenantId, Map<CaseVersion, Map<string, ItemIndexEntry>>>();
  private assocIndex = new Map<TenantId, Map<CaseVersion, Map<string, AssocIndexEntry>>>();

  constructor(private readonly cfg: FileFrameworkStoreConfig) {}

  async loadAll(): Promise<void> {
    const tenantsDir = path.join(this.cfg.baseDataDir, 'tenants');
    let tenantNames: string[];
    try {
      tenantNames = await fs.readdir(tenantsDir);
    } catch {
      return;
    }

    const versions: CaseVersion[] = ['1.0', '1.1'];

    await Promise.all(
      tenantNames.map(async tenantId => {
        const tenantPath = path.join(tenantsDir, tenantId);
        const stat = await fs.stat(tenantPath);
        if (!stat.isDirectory()) return;

        for (const version of versions) {
          const versionDir = path.join(tenantPath, version === '1.0' ? 'v1p0' : 'v1p1');
          await this.loadIndexesForTenantVersion(tenantId, version, versionDir);
        }
      })
    );
  }

  private async loadIndexesForTenantVersion(
    tenantId: TenantId,
    version: CaseVersion,
    versionDir: string
  ) {
    const idxDir = path.join(versionDir, 'indexes');
    const docsMap = await this.loadDocumentsIndex(idxDir);
    const versionsMap = await this.loadDocumentVersionsIndex(idxDir);
    const itemsMap = await this.loadItemsIndex(idxDir);
    const assocMap = await this.loadAssociationsIndex(idxDir);

    this.setTenantVersionMap(this.documents, tenantId, version, docsMap);
    this.setTenantVersionMap(this.documentVersions, tenantId, version, versionsMap);
    this.setTenantVersionMap(this.itemsIndex, tenantId, version, itemsMap);
    this.setTenantVersionMap(this.assocIndex, tenantId, version, assocMap);
  }

  private setTenantVersionMap<T>(
    root: Map<TenantId, Map<CaseVersion, Map<string, T>>>,
    tenantId: TenantId,
    version: CaseVersion,
    data: Map<string, T>
  ) {
    let tenantMap = root.get(tenantId);
    if (!tenantMap) {
      tenantMap = new Map();
      root.set(tenantId, tenantMap);
    }
    tenantMap.set(version, data);
  }

  private async loadDocumentsIndex(idxDir: string): Promise<Map<string, DocumentMetadata>> {
    const map = new Map<string, DocumentMetadata>();
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'documents.json'), 'utf8')
      ) as any[];
      for (const d of raw) {
        map.set(d.sourcedId, {
          sourcedId: d.sourcedId,
          title: d.title,
          language: d.language,
          frameworkType: d.frameworkType,
          subject: d.subject,
          version: d.version,
          lastChangeDateTime: new Date(d.lastChangeDateTime),
          currentFile: d.currentFile
        });
      }
    } catch {
      // ignore missing
    }
    return map;
  }

  private async loadDocumentVersionsIndex(
    idxDir: string
  ): Promise<Map<string, DocumentVersionInfo[]>> {
    const map = new Map<string, DocumentVersionInfo[]>();
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'document-versions.json'), 'utf8')
      ) as Record<string, any[]>;
      for (const [docId, versions] of Object.entries(raw)) {
        map.set(
          docId,
          versions.map(v => ({
            file: v.file,
            lastChangeDateTime: new Date(v.lastChangeDateTime),
            version: v.version
          }))
        );
      }
    } catch {
      // ignore missing
    }
    return map;
  }

  private async loadItemsIndex(idxDir: string): Promise<Map<string, ItemIndexEntry>> {
    const map = new Map<string, ItemIndexEntry>();
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'items.json'), 'utf8')
      ) as Record<string, { docSourcedId: string }>;
      for (const [itemId, v] of Object.entries(raw)) {
        map.set(itemId, { docSourcedId: v.docSourcedId });
      }
    } catch {
      // ignore missing
    }
    return map;
  }

  private async loadAssociationsIndex(idxDir: string): Promise<Map<string, AssocIndexEntry>> {
    const map = new Map<string, AssocIndexEntry>();
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(idxDir, 'associations.json'), 'utf8')
      ) as Record<string, { docSourcedId: string }>;
      for (const [assocId, v] of Object.entries(raw)) {
        map.set(assocId, { docSourcedId: v.docSourcedId });
      }
    } catch {
      // ignore missing
    }
    return map;
  }

  getTenantVersionRootDir(tenantId: TenantId, version: CaseVersion): string {
    const tenantDir = path.join(this.cfg.baseDataDir, 'tenants', tenantId);
    const vDir = version === '1.0' ? 'v1p0' : 'v1p1';
    return path.join(tenantDir, vDir);
  }

  async loadDocumentBundle(
    tenantId: TenantId,
    version: CaseVersion,
    docId: string
  ): Promise<{ document: any; items?: any[]; associations?: any[]; rubrics?: any[] } | null> {
    const meta = this.documents.get(tenantId)?.get(version)?.get(docId);
    if (!meta) return null;

    const rootDir = this.getTenantVersionRootDir(tenantId, version);
    const fullPath = path.join(rootDir, meta.currentFile);
    const json = JSON.parse(await fs.readFile(fullPath, 'utf8'));
    return json;
  }

  async writeBundleFile(
    tenantId: TenantId,
    version: CaseVersion,
    docId: string,
    bundle: any
  ): Promise<{ relativePath: string }> {
    const rootDir = this.getTenantVersionRootDir(tenantId, version);
    const frameworksDir = path.join(rootDir, 'frameworks', docId);
    await fs.mkdir(frameworksDir, { recursive: true });

    const existing = await fs.readdir(frameworksDir).catch(() => []);
    const nextVersion = existing.length + 1;
    const versionLabel = String(nextVersion).padStart(4, '0');
    const fileName = `${docId}_v${versionLabel}.json`;
    const fullPath = path.join(frameworksDir, fileName);
    const relativePath = path.relative(rootDir, fullPath);

    await fs.writeFile(fullPath, JSON.stringify(bundle, null, 2), 'utf8');

    return { relativePath };
  }

  // TODO: add helpers to update index json files on disk (documents.json etc.)
}

