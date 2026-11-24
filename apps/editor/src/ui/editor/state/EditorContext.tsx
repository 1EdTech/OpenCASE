/**
 * React context provider for the CASE editor.
 *
 * Holds the editor graph (via editorReducer), the CASE definition catalogues,
 * and the add-item dialog, and exposes them through useEditor().
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type {
  CaseEditorEdge,
  CaseEditorNodeDataPatch,
  CaseEditorNodeType,
  CaseItemNodeType,
} from '@/ui/editor/state/graphTypes'
import { isFrameworkNode, isItemNode } from '@/ui/editor/state/graphTypes'
import type { CFAssociationGrouping, CFDocument, CFItem, CFItemType, CFLicense, CFSubject, CFConcept } from '@/domain/case/types'
import type { FrameworkEdgeRecord } from '@/domain/framework/treeDerivation'
import type { Association } from '@/domain/framework/model/types'
import type { InlineAlignmentEdits } from '@/domain/framework/inlineAlignmentEdits'
import { NO_INLINE_ALIGNMENT_EDITS } from '@/domain/framework/inlineAlignmentEdits'
import type { AddItemDraft } from '@/ui/editor/components/AddItemDialog'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import { createSampleGraph, makeCfItem } from '@/ui/editor/state/editorFactories'
import type { CaseVersion } from '@/application/framework/mappers/case/CasePackageSnapshot'
import { editorReducer } from '@/ui/editor/state/editorReducer'
import type { EditorState } from '@/ui/editor/state/editorReducer'

// ── Default graph ──────────────────────────────────────────────────────

const DEFAULT_GRAPH = createSampleGraph()

// ── Context value type ─────────────────────────────────────────────────

type EditorContextValue = {
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
  selectedNodeId: string | null
  selectedNode: CaseEditorNodeType | null
  selectNode: (_nodeId: string) => void
  clearSelection: () => void
  frameworkInfo: { title: string; subtitle?: string; creator?: string }
  isDirty: boolean
  clearDirty: () => void
  caseVersion: CaseVersion
  cfItemTypes: CFItemType[]
  ensureCfItemType: (_title: string) => CFItemType | null
  cfSubjects: CFSubject[]
  ensureCfSubject: (_title: string) => CFSubject | null
  cfConcepts: CFConcept[]
  ensureCfConcept: (_title: string) => CFConcept | null
  cfLicenses: CFLicense[]
  cfAssociationGroupings: CFAssociationGrouping[]
  updateNodeData: (_nodeId: string, _patch: CaseEditorNodeDataPatch) => void
  addChild: (_parentId: string) => void
  inlineAlignmentEdits: InlineAlignmentEdits
  addInlineAlignment: (_association: Association) => void
  removeInlineAlignment: (_associationId: string) => void
  updateInlineAlignmentType: (_associationId: string, _associationType: string) => void
  /** Call once the edits have been saved and the loaded framework includes them */
  clearInlineAlignmentEdits: () => void
  addItemDialog: {
    open: boolean
    parentId: string | null
    draft: AddItemDraft
  }
  setAddItemDraft: (_patch: Partial<AddItemDraft>) => void
  cancelAddItem: () => void
  confirmAddItem: () => void
  cfDocument: CFDocument | undefined
  frameworkNodeId: string | null
  cfItems: CFItem[]
  frameworkEdges: FrameworkEdgeRecord[]
  rootItemIds: string[]
}

const EditorContext = createContext<EditorContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────

export function EditorProvider({
  children,
  initialGraph,
  graphKey,
  caseVersion: initialCaseVersion = '1.1',
  initialCfItemTypes,
  initialCfSubjects,
  initialCfConcepts,
  initialCfLicenses,
  initialCfAssociationGroupings,
}: Readonly<{
  children: ReactNode
  initialGraph?: EditorGraph
  graphKey?: string
  caseVersion?: CaseVersion
  /** Seed CFItemType definitions loaded from the CFPackage / definitions index */
  initialCfItemTypes?: CFItemType[]
  /** Seed CFSubject definitions loaded from the definitions index */
  initialCfSubjects?: CFSubject[]
  /** Seed CFConcept definitions loaded from the definitions index */
  initialCfConcepts?: CFConcept[]
  /** Seed CFLicense definitions loaded from the definitions index */
  initialCfLicenses?: CFLicense[]
  /** Seed CFAssociationGrouping definitions */
  initialCfAssociationGroupings?: CFAssociationGrouping[]
}>) {
  // ── CASE version ─────────────────────────────────────────────────────
  const [caseVersion, setCaseVersion] = useState<CaseVersion>(initialCaseVersion)
  useEffect(() => { setCaseVersion(initialCaseVersion) }, [initialCaseVersion])

  // ── CFItemType definitions ──────────────────────────────────────────
  const [cfItemTypes, setCfItemTypes] = useState<CFItemType[]>(initialCfItemTypes ?? [])
  useEffect(() => { setCfItemTypes(initialCfItemTypes ?? []) }, [initialCfItemTypes])

  const addCfItemType = useCallback((itemType: CFItemType) => {
    setCfItemTypes((prev) => {
      if (prev.some((t) => t.identifier === itemType.identifier)) return prev
      return [...prev, itemType]
    })
  }, [])

  /**
   * Ensure a CFItemType definition exists for the given title.
   * If it doesn't exist, creates a new one with a random UUID and adds it to state.
   * Returns the matching CFItemType (existing or newly created).
   */
  const ensureCfItemType = useCallback((title: string): CFItemType | null => {
    const trimmed = title.trim()
    if (!trimmed) return null
    // Check if a type with this title already exists
    const existing = cfItemTypes.find((t) => t.title === trimmed)
    if (existing) return existing
    // Auto-create a new definition with all fields required by the CASE v1.1 schema:
    // identifier, uri, title, description, hierarchyCode, lastChangeDateTime
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const newType: CFItemType = {
      identifier: id,
      uri: `/ims/case/v1p1/CFItemTypes/${id}`,
      title: trimmed,
      description: trimmed,
      hierarchyCode: '1',
      lastChangeDateTime: new Date().toISOString(),
    }
    addCfItemType(newType)
    return newType
  }, [cfItemTypes, addCfItemType])

  // ── CFSubject definitions ──────────────────────────────────────────
  const [cfSubjects, setCfSubjects] = useState<CFSubject[]>(initialCfSubjects ?? [])
  useEffect(() => { setCfSubjects(initialCfSubjects ?? []) }, [initialCfSubjects])

  const addCfSubject = useCallback((subject: CFSubject) => {
    setCfSubjects((prev) => {
      if (prev.some((s) => s.identifier === subject.identifier)) return prev
      return [...prev, subject]
    })
  }, [])

  /**
   * Ensure a CFSubject definition exists for the given title.
   * If it doesn't exist, creates a new one with a random UUID and adds it to state.
   * Returns the matching CFSubject (existing or newly created).
   */
  const ensureCfSubject = useCallback((title: string): CFSubject | null => {
    const trimmed = title.trim()
    if (!trimmed) return null
    const existing = cfSubjects.find((s) => s.title === trimmed)
    if (existing) return existing
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const newSubject: CFSubject = {
      identifier: id,
      uri: `/ims/case/v1p1/CFSubjects/${id}`,
      title: trimmed,
      description: trimmed,
      hierarchyCode: '1',
      lastChangeDateTime: new Date().toISOString(),
    }
    addCfSubject(newSubject)
    return newSubject
  }, [cfSubjects, addCfSubject])

  // ── CFConcept definitions ────────────────────────────────────────────
  const [cfConcepts, setCfConcepts] = useState<CFConcept[]>(initialCfConcepts ?? [])
  useEffect(() => { setCfConcepts(initialCfConcepts ?? []) }, [initialCfConcepts])

  const addCfConcept = useCallback((concept: CFConcept) => {
    setCfConcepts((prev) => {
      if (prev.some((c) => c.identifier === concept.identifier)) return prev
      return [...prev, concept]
    })
  }, [])

  /**
   * Ensure a CFConcept definition exists for the given title.
   * If it doesn't exist, creates a new one with a random UUID and adds it to state.
   * Returns the matching CFConcept (existing or newly created).
   */
  const ensureCfConcept = useCallback((title: string): CFConcept | null => {
    const trimmed = title.trim()
    if (!trimmed) return null
    const existing = cfConcepts.find((c) => c.title === trimmed)
    if (existing) return existing
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const newConcept: CFConcept = {
      identifier: id,
      uri: `/ims/case/v1p1/CFConcepts/${id}`,
      title: trimmed,
      description: trimmed,
      hierarchyCode: '1',
      lastChangeDateTime: new Date().toISOString(),
    }
    addCfConcept(newConcept)
    return newConcept
  }, [cfConcepts, addCfConcept])

  // ── CFLicense definitions ────────────────────────────────────────────
  const [cfLicenses, setCfLicenses] = useState<CFLicense[]>(initialCfLicenses ?? [])
  useEffect(() => { setCfLicenses(initialCfLicenses ?? []) }, [initialCfLicenses])

  // ── CFAssociationGrouping definitions ─────────────────────────────────
  const [cfAssociationGroupings, setCfAssociationGroupings] = useState<CFAssociationGrouping[]>(initialCfAssociationGroupings ?? [])
  useEffect(() => { setCfAssociationGroupings(initialCfAssociationGroupings ?? []) }, [initialCfAssociationGroupings])

  // ── Reducer state ────────────────────────────────────────────────────
  const seed = useMemo(() => initialGraph ?? DEFAULT_GRAPH, [initialGraph])
  const initialState: EditorState = useMemo(
    () => ({ nodes: seed.nodes, edges: seed.edges, inlineAlignmentEdits: NO_INLINE_ALIGNMENT_EDITS, selectedNodeId: null, dirty: false }),
    [seed],
  )
  const [state, dispatch] = useReducer(editorReducer, initialState)

  // ── Add-item dialog state ────────────────────────────────────────────
  const [addItemDialog, setAddItemDialog] = useState<{
    open: boolean
    parentId: string | null
    draft: AddItemDraft
  }>({
    open: false,
    parentId: null,
    draft: { fullStatement: '' },
  })

  // ── Graph / framework loading ────────────────────────────────────────
  useEffect(() => {
    if (!graphKey) return
    dispatch({ type: 'graph/load', graph: seed })
  }, [graphKey, seed])

  // ── Computed values ──────────────────────────────────────────────────

  const selectedNode = useMemo(
    () => (state.selectedNodeId ? state.nodes.find((n) => n.id === state.selectedNodeId) ?? null : null),
    [state.nodes, state.selectedNodeId],
  )

  const frameworkInfo = useMemo(() => {
    const fw = state.nodes.find(isFrameworkNode)
    const doc = fw?.data.cfDocument
    return {
      title: doc?.title ?? 'Framework',
      subtitle: doc?.frameworkType || undefined,
      creator: doc?.creator,
    }
  }, [state.nodes])

  // ── CRUD callbacks ───────────────────────────────────────────────────

  const addChild = useCallback((parentId: string) => {
    setAddItemDialog({ open: true, parentId, draft: { fullStatement: '' } })
  }, [])

  const addInlineAlignment = useCallback((association: Association) => {
    dispatch({ type: 'inlineAlignment/add', association })
  }, [])

  const removeInlineAlignment = useCallback((associationId: string) => {
    dispatch({ type: 'inlineAlignment/remove', associationId })
  }, [])

  const updateInlineAlignmentType = useCallback((associationId: string, associationType: string) => {
    dispatch({ type: 'inlineAlignment/updateType', associationId, associationType })
  }, [])

  const clearInlineAlignmentEdits = useCallback(() => {
    dispatch({ type: 'inlineAlignment/clearEdits' })
  }, [])

  const setAddItemDraft = useCallback((patch: Partial<AddItemDraft>) => {
    setAddItemDialog((s) => ({ ...s, draft: { ...s.draft, ...patch } }))
  }, [])

  const cancelAddItem = useCallback(() => {
    setAddItemDialog({ open: false, parentId: null, draft: { fullStatement: '' } })
  }, [])

  const confirmAddItem = useCallback(() => {
    const fullStatement = addItemDialog.draft.fullStatement.trim()
    if (!fullStatement || !addItemDialog.parentId) return

    const uuid = globalThis.crypto?.randomUUID?.()
    const fallbackId = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const nodeId = `tu_${uuid ?? fallbackId}`

    const parseCsv = (raw?: string) =>
      (raw ?? '').split(',').map((x) => x.trim()).filter(Boolean)

    // Auto-create CFItemType definition if it's a new value
    const typeName = addItemDialog.draft.CFItemType?.trim() || undefined
    const typeDefinition = typeName ? ensureCfItemType(typeName) : null

    // Auto-create CFSubject definitions for each subject and build subjectURI
    // Prefer the subjects array (from TagComboboxInput) over the legacy CSV string
    const subjectStrings = addItemDialog.draft.subjects?.length
      ? addItemDialog.draft.subjects
      : parseCsv(addItemDialog.draft.subjectCsv)
    const subjectURIs = subjectStrings
      .map((s) => ensureCfSubject(s))
      .filter((s): s is CFSubject => s !== null)
      .map((s) => ({ title: s.title ?? '', identifier: s.identifier, uri: s.uri }))

    const cfItemExtras: Partial<CFItem> = {
      abbreviatedStatement: addItemDialog.draft.abbreviatedStatement?.trim() || undefined,
      alternativeLabel: addItemDialog.draft.alternativeLabel?.trim() || undefined,
      humanCodingScheme: addItemDialog.draft.humanCodingScheme?.trim() || undefined,
      CFItemType: typeName,
      CFItemTypeURI: typeDefinition ? { title: typeDefinition.title ?? '', identifier: typeDefinition.identifier, uri: typeDefinition.uri } : undefined,
      subject: subjectStrings,
      subjectURI: subjectURIs.length > 0 ? subjectURIs : undefined,
      educationLevel: addItemDialog.draft.educationLevels?.length
        ? addItemDialog.draft.educationLevels
        : parseCsv(addItemDialog.draft.educationLevelCsv),
      conceptKeywords: parseCsv(addItemDialog.draft.conceptKeywordsCsv),
      notes: addItemDialog.draft.notes?.trim() || undefined,
    }

    const cfItem = makeCfItem(nodeId, fullStatement, cfItemExtras)

    dispatch({ type: 'node/addChild', parentId: addItemDialog.parentId, childId: nodeId, cfItem })

    setAddItemDialog({ open: false, parentId: null, draft: { fullStatement: '' } })
  }, [addItemDialog, ensureCfItemType, ensureCfSubject])

  const updateNodeData = useCallback(
    (nodeId: string, patch: CaseEditorNodeDataPatch) => dispatch({ type: 'node/updateData', nodeId, patch }),
    [],
  )

  const selectNode = useCallback((nodeId: string) => dispatch({ type: 'selection/setNode', nodeId }), [])
  const clearSelection = useCallback(() => dispatch({ type: 'selection/clear' }), [])
  const clearDirty = useCallback(() => dispatch({ type: 'dirty/clear' }), [])

  // ── Domain accessors (memoized, always in sync with reducer state) ────

  const cfDocument = useMemo(
    () => state.nodes.find(isFrameworkNode)?.data.cfDocument,
    [state.nodes],
  )

  const frameworkNodeId = useMemo(
    () => state.nodes.find(isFrameworkNode)?.id ?? null,
    [state.nodes],
  )

  // Cached derivation: if every
  // item node is referentially unchanged from the previous render (e.g. a
  // dispatch only touched the framework node or selection state), reuse the
  // previous `cfItems` array instead of allocating a new one. This keeps
  // `cfItems`'s identity stable across non-item edits, which matters because
  // downstream consumers (Tree Panel's `buildFrameworkTree`) key expensive
  // recomputation off this array's reference.
  const cfItemsCacheRef = useRef<{ inputs: CaseItemNodeType[]; output: CFItem[] }>({ inputs: [], output: [] })
  const cfItems = useMemo(() => {
    const itemNodes = state.nodes.filter(isItemNode)
    const prev = cfItemsCacheRef.current
    if (itemNodes.length === prev.inputs.length && itemNodes.every((n, i) => n === prev.inputs[i])) {
      return prev.output
    }
    const output = itemNodes.map((n) => n.data.cfItem)
    cfItemsCacheRef.current = { inputs: itemNodes, output }
    return output
  }, [state.nodes])

  const frameworkEdges = useMemo(
    (): FrameworkEdgeRecord[] =>
      state.edges
        // Only hierarchical item-to-item edges (isChildOf/isPartOf) represent
        // parent/child structure — non-hierarchical associations (isRelatedTo,
        // precedes, etc.) must NOT be treated as tree edges here, or a
        // reciprocal/cross-type association can introduce a cycle into what
        // buildFrameworkTree assumes is a DAG rooted at the framework node
        .filter((e) => !e.data?.isFrameworkRootConnection && e.data?.isHierarchical)
        .map((e) => ({
          parentId: e.source,
          childId: e.target,
          sequenceNumber: e.data?.sequenceNumber,
        })),
    [state.edges],
  )

  const rootItemIds = useMemo(
    () =>
      state.edges
        .filter((e) => e.data?.isFrameworkRootConnection)
        .sort((a, b) => (a.data?.sequenceNumber ?? Infinity) - (b.data?.sequenceNumber ?? Infinity))
        .map((e) => e.target),
    [state.edges],
  )

  // ── Context value ────────────────────────────────────────────────────

  const value: EditorContextValue = useMemo(
    () => ({
      nodes: state.nodes,
      edges: state.edges,
      selectedNodeId: state.selectedNodeId,
      selectedNode,
      selectNode,
      clearSelection,
      frameworkInfo,
      isDirty: state.dirty,
      clearDirty,
      caseVersion,
      cfItemTypes,
      ensureCfItemType,
      cfSubjects,
      ensureCfSubject,
      cfConcepts,
      ensureCfConcept,
      cfLicenses,
      cfAssociationGroupings,
      updateNodeData,
      addChild,
      inlineAlignmentEdits: state.inlineAlignmentEdits,
      addInlineAlignment,
      removeInlineAlignment,
      updateInlineAlignmentType,
      clearInlineAlignmentEdits,
      addItemDialog,
      setAddItemDraft,
      cancelAddItem,
      confirmAddItem,
      cfDocument,
      frameworkNodeId,
      cfItems,
      frameworkEdges,
      rootItemIds,
    }),
    [
      state.nodes, state.edges, state.selectedNodeId, selectedNode, selectNode, clearSelection,
      frameworkInfo, state.dirty, clearDirty,
      caseVersion, cfItemTypes, ensureCfItemType, cfSubjects, ensureCfSubject, cfConcepts, ensureCfConcept,
      cfLicenses, cfAssociationGroupings,
      updateNodeData, addChild,
      state.inlineAlignmentEdits, addInlineAlignment, removeInlineAlignment, updateInlineAlignmentType, clearInlineAlignmentEdits,
      addItemDialog, setAddItemDraft, cancelAddItem, confirmAddItem,
      cfDocument, frameworkNodeId, cfItems, frameworkEdges, rootItemIds,
    ],
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within an EditorProvider')
  return ctx
}
