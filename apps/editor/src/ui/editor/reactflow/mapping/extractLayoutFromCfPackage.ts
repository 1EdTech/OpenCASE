import type { CFPackage } from '@/domain/case/types'
import type { LayoutState, NodeLayout } from './types'

/** OpenCASE extension key for editor-specific data */
const OPENCASE_EXT_KEY = 'ext:opencase'

type OpencaseExtension = {
  layout?: NodeLayout
  editorNotes?: string
  edgeType?: string
}

/** Editor-level settings stored in CFDocument ext:opencase */
export type ExtractedEditorSettings = {
  edgeType?: string
}

/**
 * Extract layout state from a CFPackage's extensions.
 * 
 * The OpenCASE editor stores layout data (node positions and sizes) in the
 * `ext:opencase` extension of CFDocument and CFItems. This function extracts
 * that data to recreate the visual layout when re-opening a framework.
 * 
 * @param cfPackage - The CFPackage from the server
 * @returns LayoutState with positions/sizes for each node, or undefined if no layout data
 */
export function extractLayoutFromCfPackage(cfPackage: CFPackage): LayoutState | undefined {
  const byNodeId: Record<string, NodeLayout> = {}
  let hasLayout = false

  // Extract layout from CFDocument (framework node)
  const docExtensions = cfPackage.CFDocument?.extensions as Record<string, unknown> | undefined
  const docOpencaseExt = docExtensions?.[OPENCASE_EXT_KEY] as OpencaseExtension | undefined
  if (docOpencaseExt?.layout) {
    const docId = cfPackage.CFDocument.identifier
    byNodeId[docId] = docOpencaseExt.layout
    hasLayout = true
  }

  // Extract layout from CFItems
  for (const item of cfPackage.CFItems ?? []) {
    const itemExtensions = item.extensions as Record<string, unknown> | undefined
    const itemOpencaseExt = itemExtensions?.[OPENCASE_EXT_KEY] as OpencaseExtension | undefined
    if (itemOpencaseExt?.layout) {
      byNodeId[item.identifier] = itemOpencaseExt.layout
      hasLayout = true
    }
  }

  return hasLayout ? { byNodeId } : undefined
}

/**
 * Extract editor-level settings from a CFPackage's CFDocument extensions.
 *
 * Currently reads:
 * - `edgeType` — the edge rendering style stored in `ext:opencase.edgeType`
 *
 * @param cfPackage - The CFPackage from the server
 * @returns Settings object, or undefined if no editor settings are stored
 */
export function extractEditorSettingsFromCfPackage(cfPackage: CFPackage): ExtractedEditorSettings | undefined {
  const docExtensions = cfPackage.CFDocument?.extensions as Record<string, unknown> | undefined
  const docOpencaseExt = docExtensions?.[OPENCASE_EXT_KEY] as OpencaseExtension | undefined

  if (!docOpencaseExt?.edgeType) return undefined

  return { edgeType: docOpencaseExt.edgeType }
}
