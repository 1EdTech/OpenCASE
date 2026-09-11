import { memo, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { ComboboxInput } from '@/ui/shared/components/ui/combobox-input'
import type { ComboboxOption } from '@/ui/shared/components/ui/combobox-input'
import type { CaseEditorEdge, CaseEditorNodeType, CaseEdgeDataPatch, CaseEditorNodeDataPatch } from '../reactflow/types'
import { CASE_ASSOCIATION_TYPES, FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '../reactflow/types'
import ColorBandPicker from '@/ui/editor/components/ColorBandPicker'
import type { CFAssociationGrouping } from '@/domain/case/types'
import SidebarSection from './SidebarSection'

/* ── Shared styling constants ── */
const INPUT_CLS = 'w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2'

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
  cfAssociationGroupings?: CFAssociationGrouping[]
  ensureCfAssociationGrouping?: (_title: string) => CFAssociationGrouping | null
}

export default memo(function MultiSelectionPanel({
  selectedNodeIds, selectedEdgeIds, nodes, edges,
  onClose, onDeleteSelected, onChangeEdge, onChangeNode,
  cfAssociationGroupings = [], ensureCfAssociationGrouping,
}: Readonly<Props>) {
  const nodeCount = selectedNodeIds.length
  const edgeCount = selectedEdgeIds.length
  const totalCount = nodeCount + edgeCount
  const isOpen = totalCount > 1

  const selectedEdges = useMemo(() => {
    const idSet = new Set(selectedEdgeIds)
    return edges.filter((e) => idSet.has(e.id))
  }, [edges, selectedEdgeIds])

  const editableEdges = useMemo(
    () => selectedEdges.filter((e) => !e.data?.isFrameworkRootConnection),
    [selectedEdges],
  )

  const commonAssocType = useMemo(() => {
    if (editableEdges.length === 0) return null
    const firstType = editableEdges[0].data?.associationType
    return editableEdges.every((e) => e.data?.associationType === firstType) ? firstType : null
  }, [editableEdges])

  const selectedNodes = useMemo(() => {
    const idSet = new Set(selectedNodeIds)
    return nodes.filter((n) => idSet.has(n.id))
  }, [nodes, selectedNodeIds])

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

  const selectedItemNodes = useMemo(
    () => selectedNodes.filter((n) => n.type === 'caseItemNode'),
    [selectedNodes],
  )

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
    for (const n of selectedItemNodes) onChangeNode(n.id, { cfItem: { colorBand: color ?? '' } })
  }

  const groupingOptions: ComboboxOption[] = useMemo(
    () => cfAssociationGroupings.map((g) => ({ value: g.title ?? g.identifier, label: g.title ?? g.identifier, description: g.description })),
    [cfAssociationGroupings],
  )

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
      for (const edge of editableEdges) onChangeEdge(edge.id, { cfAssociation: { CFAssociationGroupingURI: undefined } })
      setBulkGroupingInput('')
      return
    }
    const groupDef = ensureCfAssociationGrouping?.(title)
    if (!groupDef) return
    const linkURI = { title: groupDef.title ?? '', identifier: groupDef.identifier, uri: groupDef.uri }
    for (const edge of editableEdges) onChangeEdge(edge.id, { cfAssociation: { CFAssociationGroupingURI: linkURI } })
    setBulkGroupingInput(groupDef.title ?? '')
  }

  const handleBulkAssocTypeChange = (newType: string) => {
    if (!onChangeEdge) return
    for (const edge of editableEdges) onChangeEdge(edge.id, { associationType: newType })
  }

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-20 flex h-screen w-[min(460px,92vw)] flex-col border-l border-black/10 bg-slate-50 text-slate-900 transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0 shadow-[-16px_0_40px_rgba(0,0,0,0.18)]' : 'translate-x-full',
      ].join(' ')}
      aria-label="Multi-selection"
    >
      {/* ── Sticky header ── */}
      <div className="flex items-center gap-3 border-b border-black/8 bg-white px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-500">Multi-selection</div>
          <div className="text-lg font-semibold leading-tight text-slate-900">{totalCount} items selected</div>
        </div>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2 py-3">
        <div className="space-y-1">

          {/* ── Selection summary ── */}
          <SidebarSection title="Selected items" defaultOpen>
            <div className="space-y-2">
              {itemCount > 0 ? (
                <div className="flex items-center gap-2.5 text-base text-slate-700">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-sm font-bold text-violet-700">{itemCount}</div>
                  <span>{itemCount === 1 ? 'item' : 'items'}</span>
                </div>
              ) : null}
              {frameworkCount > 0 ? (
                <div className="flex items-center gap-2.5 text-base text-slate-700">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">{frameworkCount}</div>
                  <span>{frameworkCount === 1 ? 'framework' : 'frameworks'}</span>
                </div>
              ) : null}
              {externalCount > 0 ? (
                <div className="flex items-center gap-2.5 text-base text-slate-700">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-sm font-bold text-amber-700">{externalCount}</div>
                  <span>{externalCount === 1 ? 'external framework' : 'external frameworks'}</span>
                </div>
              ) : null}
              {edgeCount > 0 ? (
                <div className="flex items-center gap-2.5 text-base text-slate-700">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">{edgeCount}</div>
                  <span>{edgeCount === 1 ? 'association' : 'associations'}</span>
                </div>
              ) : null}
            </div>
          </SidebarSection>

          {/* ── Bulk color band ── */}
          {selectedItemNodes.length > 0 ? (
            <SidebarSection title="Color band" subtitle={`Apply to ${selectedItemNodes.length} selected ${selectedItemNodes.length === 1 ? 'item' : 'items'}`} defaultOpen>
              <ColorBandPicker value={commonColorBand} onChange={handleBulkColorChange} label="" />
            </SidebarSection>
          ) : null}

          {/* ── Bulk edge type ── */}
          {editableEdges.length > 0 ? (
            <SidebarSection title="Change association type" subtitle={`Apply to ${editableEdges.length} selected ${editableEdges.length === 1 ? 'association' : 'associations'}`} defaultOpen>
              <select
                className={INPUT_CLS}
                value={commonAssocType ?? ''}
                onChange={(e) => { if (e.target.value) handleBulkAssocTypeChange(e.target.value) }}
              >
                {commonAssocType === null ? <option value="">Mixed types — select to change all</option> : null}
                {CASE_ASSOCIATION_TYPES.map((t) => (
                  <option key={t} value={t}>{ASSOCIATION_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </SidebarSection>
          ) : null}

          {/* ── Bulk association grouping ── */}
          {editableEdges.length > 0 ? (
            <SidebarSection title="Association grouping" subtitle={`Apply to ${editableEdges.length} selected ${editableEdges.length === 1 ? 'association' : 'associations'}`} defaultOpen>
              <div className="space-y-2">
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
                  <button type="button" onClick={() => handleBulkGroupingChange('')} className="text-sm text-slate-500 hover:text-red-600">
                    Clear grouping on all
                  </button>
                ) : null}
              </div>
            </SidebarSection>
          ) : null}

          {/* ── Delete ── */}
          <SidebarSection title="Danger zone" subtitle={`Delete all ${totalCount} selected items.`} accentColor="#dc2626" defaultOpen>
            <Button
              variant="secondary"
              onClick={onDeleteSelected}
              className="w-full border-red-200 bg-white text-red-700 hover:bg-red-100 hover:text-red-800"
            >
              Delete selected ({totalCount})
            </Button>
          </SidebarSection>

          {/* ── Tip ── */}
          <div className="mx-4 my-2 flex items-center gap-2 rounded-xl bg-slate-100 p-3">
            <span className="text-sm text-slate-500">
              <strong>Tip:</strong> Hold <kbd className="mx-0.5 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-xs">Shift</kbd> and click to add or remove items. Use <kbd className="mx-0.5 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-xs">Shift</kbd> + drag to box-select.
            </span>
          </div>

        </div>
      </div>
    </aside>
  )
})
