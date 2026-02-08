import type { CFDocument } from '@/domain/case/types'
import type { Framework, FrameworkMetadata, Item, Association } from '@/domain/framework/model/types'
import type { FrameworkId, ItemId, AssociationId } from '@/domain/shared/types'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { createEmptyFrameworkGraph } from '@/ui/editor/state/editorFactories'
import type { CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'

/**
 * HomeFramework represents a framework entry in the home screen list.
 *
 * It holds the domain Framework as the source of truth, plus optional cfDocument
 * for display purposes (title, creator, etc.). The graph is no longer stored here;
 * it's derived from the Framework when entering the editor.
 */
export type HomeFramework = {
  id: string
  /** The domain Framework - source of truth */
  framework: Framework
  /** Display metadata extracted from the framework (for backward compat and quick access) */
  cfDocument: CFDocument
  /**
   * Legacy: EditorGraph stored directly. Used for backward compatibility with
   * localStorage data that predates the domain-first architecture.
   * @deprecated Use `framework` instead; graph should be derived via `toReactFlowGraph`
   */
  graph?: EditorGraph
}

const STORAGE_KEY = 'case-editor:frameworks:v1'

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Create a minimal domain Framework from display metadata.
 */
function createFrameworkFromMetadata(params: {
  id: string
  title: string
  description?: string
  creator?: string
  frameworkType?: string
  adoptionStatus?: string
  caseVersion?: string
}): Framework {
  const metadata: FrameworkMetadata = {
    title: params.title,
    description: params.description,
    creator: params.creator,
    frameworkType: params.frameworkType,
    adoptionStatus: params.adoptionStatus,
    caseVersion: params.caseVersion ?? '1.1', // Default to CASE 1.1 for new frameworks
    lastChangeDateTime: new Date().toISOString(),
  }

  return {
    id: params.id as unknown as FrameworkId,
    metadata,
    items: new Map(),
    associations: new Map(),
    status: params.adoptionStatus === 'Published' ? 'Published' : 'Draft',
  }
}

/**
 * Create a CFDocument from domain Framework metadata (for display purposes).
 */
function createCfDocumentFromFramework(framework: Framework): CFDocument {
  const meta = framework.metadata ?? {}
  const id = framework.id as unknown as string

  return {
    identifier: id,
    uri: `urn:case:document:${id}`,
    creator: meta.creator ?? 'District Curriculum Team',
    title: meta.title ?? 'Untitled framework',
    description: meta.description,
    frameworkType: meta.frameworkType,
    adoptionStatus: meta.adoptionStatus,
    caseVersion: meta.caseVersion,
    lastChangeDateTime: meta.lastChangeDateTime ?? new Date().toISOString(),
    CFPackageURI: { uri: `urn:case:package:${id}` },
    licenseURI: meta.licenseURI,
  }
}

/**
 * Convert a legacy HomeFramework (with graph but no framework) to the new format.
 */
function migrateLegacyHomeFramework(legacy: { id: string; cfDocument: CFDocument; graph?: EditorGraph }): HomeFramework {
  // If there's no framework, create one from the cfDocument
  const doc = legacy.cfDocument
  const framework = createFrameworkFromMetadata({
    id: legacy.id,
    title: doc.title,
    description: doc.description,
    creator: doc.creator,
    frameworkType: doc.frameworkType,
    adoptionStatus: doc.adoptionStatus,
  })

  // Preserve the legacy graph for backward compatibility
  return {
    id: legacy.id,
    framework,
    cfDocument: doc,
    graph: legacy.graph,
  }
}

type LegacyHomeFramework = { id: string; cfDocument: CFDocument; graph?: EditorGraph; framework?: Framework }

export function loadFrameworks(): HomeFramework[] {
  const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  const parsed = safeParse<LegacyHomeFramework[]>(raw)

  if (parsed?.length) {
    // Migrate any legacy entries that don't have a framework property
    return parsed.map((entry) => {
      if (entry.framework) {
        // Already has framework - ensure Maps are reconstructed (they don't survive JSON)
        // Note: branded types are preserved since they're just string at runtime
        const itemEntries = Object.entries(entry.framework.items ?? {}) as [ItemId, Item][]
        const assocEntries = Object.entries(entry.framework.associations ?? {}) as [AssociationId, Association][]

        const framework: Framework = {
          ...entry.framework,
          id: entry.framework.id as unknown as FrameworkId,
          items: new Map(itemEntries),
          associations: new Map(assocEntries),
        }
        return { ...entry, framework } as HomeFramework
      }
      return migrateLegacyHomeFramework(entry)
    })
  }

  return []
}

/**
 * Serialize a HomeFramework for localStorage (Maps don't survive JSON.stringify).
 */
function serializeForStorage(frameworks: HomeFramework[]): unknown[] {
  return frameworks.map((fw) => ({
    ...fw,
    framework: {
      ...fw.framework,
      // Convert Maps to plain objects for JSON serialization
      items: Object.fromEntries(fw.framework.items),
      associations: Object.fromEntries(fw.framework.associations),
    },
  }))
}

export function saveFrameworks(frameworks: HomeFramework[]) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(serializeForStorage(frameworks)))
  } catch {
    // ignore: localStorage might be unavailable (privacy mode, etc.)
  }
}

export function createNewFrameworkDraft(params: CreateFrameworkDraft): HomeFramework {
  const id = globalThis.crypto?.randomUUID?.() ?? `fw_${Date.now()}`
  const title = params.title || 'New framework (Draft)'

  // Create the domain Framework first
  const framework = createFrameworkFromMetadata({
    id,
    title,
    frameworkType: params.frameworkType ?? 'K-12',
    adoptionStatus: params.adoptionStatus ?? 'Draft',
    description: params.description ?? '',
    creator: 'District Curriculum Team',
  })

  // Create the cfDocument for display
  const cfDocument = createCfDocumentFromFramework(framework)

  // Also create the legacy graph for backward compatibility
  const graph = createEmptyFrameworkGraph({
    id,
    title,
    frameworkType: params.frameworkType ?? 'K-12',
    adoptionStatus: params.adoptionStatus ?? 'Draft',
    description: params.description ?? '',
    creator: 'District Curriculum Team',
  })

  return { id, framework, cfDocument, graph }
}

/**
 * Create a HomeFramework entry from a domain Framework.
 *
 * This is the preferred way to add new frameworks - start with the domain model.
 */
export function createHomeFrameworkFromDomain(framework: Framework): HomeFramework {
  const cfDocument = createCfDocumentFromFramework(framework)
  return {
    id: framework.id as unknown as string,
    framework,
    cfDocument,
    // No legacy graph - it will be derived from framework when needed
  }
}
