import { useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { ComboboxInput } from '@/ui/shared/components/ui/combobox-input'
import type { ComboboxOption } from '@/ui/shared/components/ui/combobox-input'
import type { CaseEditorEdge, CaseEditorNodeType, CaseEdgeDataPatch, CaseEditorNodeDataPatch } from '../reactflow/types'
import { CASE_ASSOCIATION_TYPES, FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '../reactflow/types'
import ColorBandPicker from '@/ui/editor/components/ColorBandPicker'
import { useEditor } from '@/ui/editor/state/EditorContext'

/** Human-friendly labels for CASE association types */
const ASSOCIATION_TYPE_LABELS: Record<string, string> = {
  [FRAMEWORK_ROOT_ASSOCIATION_TYPE]: 'Starts',
  isChildOf: 'Is Child Of',
  isPeerOf: 'Is Peer Of',
  isPartOf: 'Is Part Of',
  exactMatchOf: 'Exact Match Of',
  precedes: 'Precedes',
  isRelatedTo: 'Is Related To',
  isTranslationOf: 'Is Translation Of',
}

type Props = {
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
  onClose?: () => void
  onDeleteSelected?: () => void
  onChangeEdge?: (_edgeId: string, _patch: CaseEdgeDataPatch) => void
  onChangeNode?: (_nodeId: string, _patch: CaseEditorNodeDataPatch) => void
}

export default function MultiSelectionPanel({
  selectedNodeIds,
  selectedEdgeIds,
  nodes,
  edges,
  onClose,
  onDeleteSelected,
  onChangeEdge,
  onChangeNode,
}: Readonly<Props>) {
  const nodeCount = selectedNodeIds.length
  const edgeCount = selectedEdgeIds.length
  const totalCount = nodeCount + edgeCount

  const isOpen = totalCount > 1

  // Get the selected edges for bulk editing
  const selectedEdges = useMemo(() => {
    const idSet = new Set(selectedEdgeIds)
    return edges.filter((e) => idSet.has(e.id))
  }, [edges, selectedEdgeIds])

  // Filter out framework root connections (not editable)
  const editableEdges = useMemo(
    () => selectedEdges.filter((e) => !e.data?.isFrameworkRootConnection),
    [selectedEdges],
  )

  // Check if all editable edges have the same association type
  const commonAssocType = useMemo(() => {
    if (editableEdges.length === 0) return null
    const firstType = editableEdges[0].data?.associationType
    return editableEdges.every((e) => e.data?.associationType === firstType) ? firstType : null
  }, [editableEdges])

  // Count selected item types for the summary
  const selectedNodes = useMemo(() => {
    const idSet = new Set(selectedNodeIds)
    return nodes.filter((n) => idSet.has(n.id))
  }, [nodes, selectedNodeIds])

  // Count by type
  const counts = useMemo(() => {
    let items = 0, frameworks = 0, externals = 0
    for (const n of selectedNodes) {
      if (n.type === 'caseItemNode') items++
      else if (n.type === 'caseFrameworkNode') frameworks++
      else if (n.type === 'externalFrameworkNode') externals++
    }
    return { items, frameworks, externals }
  }, [selectedNodes])

  const { items: itemCount, frameworks: frameworkCount, externals: externalCount } = counts

  // Item nodes for bulk color band editing
  const selectedItemNodes = useMemo(
    () => selectedNodes.filter((n) => n.type === 'caseItemNode'),
    [selectedNodes],
  )

  // Common color band across selected items (undefined if mixed)
  const commonColorBand = useMemo(() => {
    if (selectedItemNodes.length === 0) return undefined
    const first = (selectedItemNodes[0].data as { cfItem?: { colorBand?: string } })?.cfItem?.colorBand ?? ''
    const allSame = selectedItemNodes.every(
      (n) => ((n.data as { cfItem?: { colorBand?: string } })?.cfItem?.colorBand ?? '') === first,
    )
    return allSame ? (first || undefined) : undefined
  }, [selectedItemNodes])

  const handleBulkColorChange = (color: string | undefined) => {
    if (!onChangeNode) return
    for (const n of selectedItemNodes) {
      onChangeNode(n.id, { cfItem: { colorBand: color ?? '' } })
    }
  }

  // ── Association Grouping bulk editing ──────────────────────────────
  const { cfAssociationGroupings, ensureCfAssociationGrouping } = useEditor()

  const groupingOptions: ComboboxOption[] = useMemo(
    () => cfAssociationGroupings.map((g) => ({ value: g.title ?? g.identifier, label: g.title ?? g.identifier, description: g.description })),
    [cfAssociationGroupings],
  )

  // Common grouping across selected editable edges
  const commonGroupingTitle = useMemo(() => {
    if (editableEdges.length === 0) return null
    const first = editableEdges[0].data?.cfAssociation?.CFAssociationGroupingURI?.title ?? ''
    const allSame = editableEdges.every(
      (e) => (e.data?.cfAssociation?.CFAssociationGroupingURI?.title ?? '') === first,
    )
    return allSame ? first : null
  }, [editableEdges])

  const [bulkGroupingInput, setBulkGroupingInput] = useState('')

  const handleBulkGroupingChange = (title: string) => {
    if (!onChangeEdge) return
    if (!title.trim()) {
      // Clear grouping on all
      for (const edge of editableEdges) {
        onChangeEdge(edge.id, { cfAssociation: { CFAssociationGroupingURI: undefined } })
      }
      setBulkGroupingInput('')
      return
    }
    const groupDef = ensureCfAssociationGrouping(title)
    if (!groupDef) return
    const linkURI = { title: groupDef.title ?? '', identifier: groupDef.identifier, uri: groupDef.uri }
    for (const edge of editableEdges) {
      onChangeEdge(edge.id, { cfAssociation: { CFAssociationGroupingURI: linkURI } })
    }
    setBulkGroupingInput(groupDef.title ?? '')
  }

  const handleBulkAssocTypeChange = (newType: string) => {
    if (!onChangeEdge) return
    for (const edge of editableEdges) {
      onChangeEdge(edge.id, { associationType: newType })
    }
  }

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-20 flex h-screen w-[min(460px,92vw)] flex-col border-l border-black/10 bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-[-16px_0_40px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      aria-label="Multi-selection"
    >
      <div className="flex items-center justify-between border-b border-black/10 bg-white/70 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-sm font-bold">Selection</div>
          <div className="text-xs text-slate-500">
            {totalCount} items selected
          </div>
        </div>
        <Button variant="secondary" size="xs" onClick={() => onClose?.()}>
          Close
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {/* Selection summary */}
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-900">Selected items</div>
            </div>
            <div className="space-y-1.5">
              {itemCount > 0 ? (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-xs font-bold text-violet-700">
                    {itemCount}
                  </div>
                  <span>{itemCount === 1 ? 'item' : 'items'}</span>
                </div>
              ) : null}
              {frameworkCount > 0 ? (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-blue-700">
                    {frameworkCount}
                  </div>
                  <span>{frameworkCount === 1 ? 'framework' : 'frameworks'}</span>
                </div>
              ) : null}
              {externalCount > 0 ? (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-xs font-bold text-amber-700">
                    {externalCount}
                  </div>
                  <span>{externalCount === 1 ? 'external framework' : 'external frameworks'}</span>
                </div>
              ) : null}
              {edgeCount > 0 ? (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                    {edgeCount}
                  </div>
                  <span>{edgeCount === 1 ? 'association' : 'associations'}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Bulk color band */}
          {selectedItemNodes.length > 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">Color band</div>
                <div className="text-xs text-slate-500">
                  Apply to {selectedItemNodes.length} selected {selectedItemNodes.length === 1 ? 'item' : 'items'}
                </div>
              </div>
              <ColorBandPicker
                value={commonColorBand}
                onChange={handleBulkColorChange}
                label=""
              />
            </div>
          ) : null}

          {/* Bulk edge type change */}
          {editableEdges.length > 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">Change association type</div>
                <div className="text-xs text-slate-500">
                  Apply to {editableEdges.length} selected {editableEdges.length === 1 ? 'association' : 'associations'}
                </div>
              </div>
              <select
                className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                value={commonAssocType ?? ''}
                onChange={(e) => {
                  if (e.target.value) handleBulkAssocTypeChange(e.target.value)
                }}
              >
                {commonAssocType === null ? (
                  <option value="">Mixed types — select to change all</option>
                ) : null}
                {CASE_ASSOCIATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ASSOCIATION_TYPE_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Bulk association grouping */}
          {editableEdges.length > 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">Association grouping</div>
                <div className="text-xs text-slate-500">
                  Apply to {editableEdges.length} selected {editableEdges.length === 1 ? 'association' : 'associations'}
                </div>
              </div>
              <ComboboxInput
                id="bulk-grouping"
                value={bulkGroupingInput}
                onChange={(v) => setBulkGroupingInput(v)}
                onCommit={(v) => handleBulkGroupingChange(v)}
                options={groupingOptions}
                placeholder={commonGroupingTitle === null ? 'Mixed — select to apply to all' : 'Select or type a grouping…'}
                className="w-full"
              />
              {commonGroupingTitle ? (
                <button
                  type="button"
                  onClick={() => handleBulkGroupingChange('')}
                  className="mt-1 text-xs text-slate-500 hover:text-red-600"
                >
                  Clear grouping on all
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Delete action */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-sm font-semibold text-red-900">Danger zone</div>
              <div className="text-xs text-red-700">
                Delete all {totalCount} selected items. This cannot be undone.
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={onDeleteSelected}
              className="w-full border-red-200 bg-white text-red-700 hover:bg-red-100 hover:text-red-800"
            >
              Delete selected ({totalCount})
            </Button>
          </div>

          {/* Tip */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">
              <strong>Tip:</strong> Hold <kbd className="mx-0.5 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">Shift</kbd> and click to add or remove items from the selection. Use <kbd className="mx-0.5 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[10px]">Shift</kbd> + drag to box-select.
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
