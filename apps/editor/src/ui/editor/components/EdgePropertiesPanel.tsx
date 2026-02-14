import { memo, useEffect, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { ComboboxInput } from '@/ui/shared/components/ui/combobox-input'
import type { ComboboxOption } from '@/ui/shared/components/ui/combobox-input'
import type { CaseEdgeDataPatch, CaseEditorEdge, CaseAssociationType } from '../reactflow/types'
import { CASE_ASSOCIATION_TYPES, FRAMEWORK_ROOT_ASSOCIATION_TYPE } from '../reactflow/types'
import type { CaseEditorNodeType, CaseItemNodeType, CaseFrameworkNodeType } from '../reactflow/types'
import type { CFAssociationGrouping } from '@/domain/case/types'
import SidebarSection from './SidebarSection'

/* ── Shared styling constants ── */
const INPUT_CLS = 'w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2'
const LABEL_CLS = 'mb-1.5 block text-sm font-medium text-slate-700'
const HINT_CLS = 'mt-1.5 text-sm text-slate-500'

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

/** Descriptions for each association type */
const ASSOCIATION_TYPE_DESCRIPTIONS: Record<string, string> = {
  [FRAMEWORK_ROOT_ASSOCIATION_TYPE]: 'Framework root connection — links the framework to its top-level items (visual only)',
  isChildOf: 'The destination item is a child of the origin item (hierarchical)',
  isPeerOf: 'The origin item is a peer/sibling of the destination item',
  isPartOf: 'The destination item is a component part of the origin item',
  exactMatchOf: 'The origin item has an exact semantic match with the destination',
  precedes: 'The origin item should come before the destination (ordering)',
  isRelatedTo: 'The origin item is related to the destination (general relationship)',
  isTranslationOf: 'The destination item is a translation of the origin item',
}

type Props = {
  edge: CaseEditorEdge | null
  nodes: CaseEditorNodeType[]
  onClose?: () => void
  onChangeEdge?: (_edgeId: string, _patch: CaseEdgeDataPatch) => void
  onFlipEdge?: (_edgeId: string) => void
  cfAssociationGroupings?: CFAssociationGrouping[]
  ensureCfAssociationGrouping?: (_title: string) => CFAssociationGrouping | null
}

export default memo(function EdgePropertiesPanel({ edge, nodes, onClose, onChangeEdge, onFlipEdge, cfAssociationGroupings = [], ensureCfAssociationGrouping }: Readonly<Props>) {
  const [copied, setCopied] = useState<null | 'uri'>(null)
  const [customType, setCustomType] = useState('')
  const [groupingInput, setGroupingInput] = useState('')

  useEffect(() => {
    setGroupingInput(edge?.data?.cfAssociation?.CFAssociationGroupingURI?.title ?? '')
  }, [edge?.id, edge?.data?.cfAssociation?.CFAssociationGroupingURI?.title])

  const groupingOptions: ComboboxOption[] = useMemo(
    () => cfAssociationGroupings.map((g) => ({ value: g.title ?? g.identifier, label: g.title ?? g.identifier, description: g.description })),
    [cfAssociationGroupings],
  )

  useEffect(() => {
    if (!edge) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [edge, onClose])

  const isItemNode = (n: CaseEditorNodeType): n is CaseItemNodeType => n.type === 'caseItemNode'
  const isFrameworkNode = (n: CaseEditorNodeType): n is CaseFrameworkNodeType => n.type === 'caseFrameworkNode'

  const sourceNode = useMemo(() => nodes.find((n) => n.id === edge?.source), [nodes, edge?.source])
  const targetNode = useMemo(() => nodes.find((n) => n.id === edge?.target), [nodes, edge?.target])

  const isFrameworkRootConnection = edge?.data?.isFrameworkRootConnection ?? false
  const involvesMainFrameworkNode = sourceNode?.type === 'caseFrameworkNode' || targetNode?.type === 'caseFrameworkNode'
  const isLockedType = isFrameworkRootConnection || involvesMainFrameworkNode

  const involvesExternalFrameworkNode = sourceNode?.type === 'externalFrameworkNode' || targetNode?.type === 'externalFrameworkNode'
  const allowedAssociationTypes = involvesExternalFrameworkNode
    ? (['isPartOf'] as const)
    : CASE_ASSOCIATION_TYPES

  const getNodeLabel = (node: CaseEditorNodeType | undefined): string => {
    if (!node) return 'Unknown'
    if (isFrameworkNode(node)) return node.data.cfDocument?.title ?? 'Framework'
    if (isItemNode(node)) return node.data.cfItem?.humanCodingScheme ?? node.data.cfItem?.alternativeLabel ?? node.data.cfItem?.abbreviatedStatement ?? 'Item'
    return 'Unknown'
  }

  const cfAssociation = edge?.data?.cfAssociation
  const associationType = edge?.data?.associationType ?? cfAssociation?.associationType ?? 'isChildOf'
  const sequenceNumber = edge?.data?.sequenceNumber ?? cfAssociation?.sequenceNumber
  const isStandardType = CASE_ASSOCIATION_TYPES.includes(associationType as typeof CASE_ASSOCIATION_TYPES[number])
  const isCustomType = !isStandardType && associationType !== ''

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }).format(d)
  }

  const updateEdge = (patch: CaseEdgeDataPatch) => {
    if (!edge) return
    onChangeEdge?.(edge.id, patch)
  }

  const handleAssociationTypeChange = (newType: CaseAssociationType) => {
    updateEdge({ associationType: newType, cfAssociation: { associationType: newType } })
  }

  const handleSequenceNumberChange = (value: string) => {
    const num = value === '' ? undefined : Number.parseInt(value, 10)
    if (value !== '' && Number.isNaN(num)) return
    updateEdge({ sequenceNumber: num, cfAssociation: { sequenceNumber: num } })
  }

  const handleNotesChange = (notes: string) => {
    updateEdge({ cfAssociation: { notes: notes || undefined } })
  }

  const handleCustomTypeSubmit = () => {
    if (!customType.trim()) return
    const fullType = customType.startsWith('ext:') ? customType : `ext:${customType}`
    handleAssociationTypeChange(fullType)
    setCustomType('')
  }

  const copyToClipboard = async (text: string) => {
    try {
      await globalThis.navigator?.clipboard?.writeText(text)
      setCopied('uri')
      globalThis.setTimeout(() => setCopied(null), 1200)
    } catch { /* best-effort */ }
  }

  const isOpen = Boolean(edge)

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-20 flex h-screen w-[min(460px,92vw)] flex-col border-l border-black/10 bg-slate-50 text-slate-900 shadow-[-16px_0_40px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      aria-label="Association details"
    >
      {/* ── Sticky header ── */}
      <div className="flex items-center gap-3 border-b border-black/8 bg-white px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-500">Association</div>
          <div className="truncate text-lg font-semibold leading-tight text-slate-900">
            {ASSOCIATION_TYPE_LABELS[associationType] ?? associationType}
          </div>
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

      {edge ? (
        <div className="flex-1 overflow-auto px-2 py-3">
          <div className="space-y-1">

            {/* ── Connection ── */}
            <SidebarSection title="Connection" subtitle="Origin and destination." defaultOpen>
              <div className="space-y-3">
                <div className="rounded-xl border border-black/8 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">O</div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-500">Origin</div>
                      <div className="text-sm font-medium text-slate-900">{getNodeLabel(sourceNode)}</div>
                    </div>
                  </div>
                  <div className="my-2 ml-3 flex items-center gap-2 border-l-2 border-slate-200 py-1 pl-4">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {!isLockedType && (
                      <button
                        type="button"
                        onClick={() => edge && onFlipEdge?.(edge.id)}
                        className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                        title="Swap origin and destination"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        Flip
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">D</div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-500">Destination</div>
                      <div className="text-sm font-medium text-slate-900">{getNodeLabel(targetNode)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2">
                  <svg className="h-4 w-4 shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-violet-700">
                    <span className="font-medium">Tip:</span> Drag the purple handles to reconnect to a different node.
                  </span>
                </div>
              </div>
            </SidebarSection>

            {/* ── Association Type ── */}
            <SidebarSection
              title="Association type"
              subtitle={
                isLockedType
                  ? 'Locked — framework root connections are visual only.'
                  : involvesExternalFrameworkNode
                    ? 'External framework — must use "Is Part Of".'
                    : 'How the origin item relates to the destination.'
              }
              defaultOpen
            >
              {isLockedType ? (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                      <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-violet-900">{ASSOCIATION_TYPE_LABELS[associationType] ?? 'Starts'}</div>
                      <div className="text-sm text-violet-700">{ASSOCIATION_TYPE_DESCRIPTIONS[associationType] ?? ASSOCIATION_TYPE_DESCRIPTIONS[FRAMEWORK_ROOT_ASSOCIATION_TYPE]}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {involvesExternalFrameworkNode && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <svg className="h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-amber-700">External framework connections must use &quot;Is Part Of&quot;.</span>
                    </div>
                  )}
                  {allowedAssociationTypes.map((type) => (
                    <label
                      key={type}
                      className={[
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                        associationType === type ? 'border-violet-300 bg-violet-50' : 'border-black/10 hover:border-black/20 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <input type="radio" name="associationType" value={type} checked={associationType === type} onChange={() => handleAssociationTypeChange(type)} className="mt-0.5 h-4 w-4 text-violet-600 focus:ring-violet-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{ASSOCIATION_TYPE_LABELS[type]}</div>
                        <div className="text-sm text-slate-500">{ASSOCIATION_TYPE_DESCRIPTIONS[type]}</div>
                      </div>
                    </label>
                  ))}

                  {!involvesExternalFrameworkNode && (
                    <div className={['rounded-xl border p-3 transition-colors', isCustomType ? 'border-violet-300 bg-violet-50' : 'border-black/10'].join(' ')}>
                      <div className="mb-2 text-sm font-medium text-slate-900">Custom extension type</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={isCustomType ? associationType : customType}
                          onChange={(e) => { if (isCustomType) handleAssociationTypeChange(e.target.value); else setCustomType(e.target.value) }}
                          placeholder="ext:myCustomType"
                          className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                        />
                        {!isCustomType && customType && (
                          <Button variant="secondary" size="xs" onClick={handleCustomTypeSubmit}>Apply</Button>
                        )}
                      </div>
                      <div className={HINT_CLS}>Use ext: prefix for custom association types</div>
                    </div>
                  )}
                </div>
              )}
            </SidebarSection>

            {/* ── Sequence Number ── */}
            <SidebarSection title="Sequence number" subtitle="Optional ordering — lower numbers appear first." defaultOpen>
              <input
                type="number"
                min="0"
                step="1"
                value={sequenceNumber ?? ''}
                onChange={(e) => handleSequenceNumberChange(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className={INPUT_CLS}
              />
            </SidebarSection>

            {/* ── Association Grouping ── */}
            {!isLockedType ? (
              <SidebarSection title="Association grouping" subtitle="Group related associations for pathway visualisation." defaultOpen>
                <div className="space-y-2">
                  <ComboboxInput
                    id="edge-grouping"
                    value={groupingInput}
                    onChange={(v) => setGroupingInput(v)}
                    onCommit={(v) => {
                      if (!v.trim()) { updateEdge({ cfAssociation: { CFAssociationGroupingURI: undefined } }); setGroupingInput(''); return }
                      const groupDef = ensureCfAssociationGrouping?.(v)
                      if (groupDef) { updateEdge({ cfAssociation: { CFAssociationGroupingURI: { title: groupDef.title ?? '', identifier: groupDef.identifier, uri: groupDef.uri } } }); setGroupingInput(groupDef.title ?? '') }
                    }}
                    options={groupingOptions}
                    placeholder="Select or type a grouping…"
                    className="w-full"
                  />
                  {cfAssociation?.CFAssociationGroupingURI ? (
                    <button type="button" onClick={() => { updateEdge({ cfAssociation: { CFAssociationGroupingURI: undefined } }); setGroupingInput('') }} className="text-sm text-slate-500 hover:text-red-600">
                      Clear grouping
                    </button>
                  ) : null}
                </div>
              </SidebarSection>
            ) : null}

            {/* ── Notes ── */}
            <SidebarSection title="Notes" subtitle="Optional context about this relationship." defaultOpen={false}>
              <textarea
                rows={3}
                value={cfAssociation?.notes ?? ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about this association..."
                className={`${INPUT_CLS} resize-y`}
              />
            </SidebarSection>

            {/* ── Technical details ── */}
            <SidebarSection title="Technical details" subtitle="IDs, URIs" defaultOpen={false}>
              <div className="rounded-lg border border-black/10 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-700">IDs and links</div>
                  {cfAssociation?.uri ? (
                    <Button variant="secondary" size="xs" onClick={() => { if (cfAssociation?.uri) void copyToClipboard(cfAssociation.uri) }} title="Copy URI">
                      {copied === 'uri' ? 'Copied' : 'Copy URI'}
                    </Button>
                  ) : null}
                </div>
                {(
                  [
                    ['Edge ID', edge.id],
                    ['Identifier', cfAssociation?.identifier],
                    ['URI', cfAssociation?.uri],
                    ['Origin URI', cfAssociation?.originNodeURI?.uri],
                    ['Origin ID', cfAssociation?.originNodeURI?.identifier],
                    ['Destination URI', cfAssociation?.destinationNodeURI?.uri],
                    ['Destination ID', cfAssociation?.destinationNodeURI?.identifier],
                    ['Document URI', cfAssociation?.CFDocumentURI?.uri],
                    ['Grouping URI', cfAssociation?.CFAssociationGroupingURI?.uri],
                    ['Last change', formatDateTime(cfAssociation?.lastChangeDateTime)],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[140px_1fr] gap-2 border-b border-black/5 py-1.5 last:border-b-0">
                      <div className="text-xs text-slate-500">{k}</div>
                      <div className="wrap-break-word font-mono text-xs text-slate-900">{String(v)}</div>
                    </div>
                  ))}
              </div>
            </SidebarSection>

          </div>
        </div>
      ) : null}
    </aside>
  )
})
