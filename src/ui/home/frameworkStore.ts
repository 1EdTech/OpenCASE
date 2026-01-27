import type { CFDocument } from '@/domain/case/types'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { createEmptyFrameworkGraph, createSampleGraph } from '@/ui/editor/state/editorFactories'
import type { CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'

export type HomeFramework = {
  id: string
  cfDocument: CFDocument
  graph: EditorGraph
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

function seedFrameworks(): HomeFramework[] {
  const sample = createSampleGraph()
  const fwNode = sample.nodes.find((n) => n.type === 'caseFrameworkNode')
  const cfDocument = (fwNode?.data as { cfDocument?: CFDocument })?.cfDocument
  const sampleId = cfDocument?.identifier ?? 'fw1'

  const other = createEmptyFrameworkGraph({
    id: 'fw2',
    title: 'Science Practices (Draft)',
    frameworkType: 'K-12',
    adoptionStatus: 'Draft',
    description: 'Mock framework to demonstrate Home → Editor navigation.',
    creator: 'Curriculum Team',
  })
  const otherDoc = (other.nodes[0].data as { cfDocument: CFDocument }).cfDocument

  return [
    { id: sampleId, cfDocument: cfDocument!, graph: sample },
    { id: otherDoc.identifier, cfDocument: otherDoc, graph: other },
  ].filter((f) => Boolean(f.cfDocument))
}

export function loadFrameworks(): HomeFramework[] {
  const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  const parsed = safeParse<HomeFramework[]>(raw)
  if (parsed?.length) return parsed

  const seed = seedFrameworks()
  saveFrameworks(seed)
  return seed
}

export function saveFrameworks(frameworks: HomeFramework[]) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(frameworks))
  } catch {
    // ignore: localStorage might be unavailable (privacy mode, etc.)
  }
}

export function createNewFrameworkDraft(params: CreateFrameworkDraft): HomeFramework {
  const id = globalThis.crypto?.randomUUID?.() ?? `fw_${Date.now()}`
  const title = params.title || 'New framework (Draft)'
  const graph = createEmptyFrameworkGraph({
    id,
    title,
    frameworkType: params.frameworkType ?? 'K-12',
    adoptionStatus: params.adoptionStatus ?? 'Draft',
    description: params.description ?? '',
    creator: 'District Curriculum Team',
  })

  const cfDocument = (graph.nodes[0].data as { cfDocument: CFDocument }).cfDocument
  return { id, cfDocument, graph }
}

