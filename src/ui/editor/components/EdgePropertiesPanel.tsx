import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import type { CaseEdgeDataPatch, CaseEditorEdge, CaseAssociationType } from '../reactflow/types'
import { CASE_ASSOCIATION_TYPES } from '../reactflow/types'
import type { CaseEditorNodeType, CaseItemNodeType, CaseFrameworkNodeType, ExternalFrameworkNodeType } from '../reactflow/types'

type Props = {
  edge: CaseEditorEdge | null
  nodes: CaseEditorNodeType[]
  onClose?: () => void
  onChangeEdge?: (_edgeId: string, _patch: CaseEdgeDataPatch) => void
  onFlipEdge?: (_edgeId: string) => void
}

/** Human-friendly labels for CASE association types */
const ASSOCIATION_TYPE_LABELS: Record<string, string> = {
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
  isChildOf: 'The destination item is a child of the origin item (hierarchical)',
  isPeerOf: 'The origin item is a peer/sibling of the destination item',
  isPartOf: 'The destination item is a component part of the origin item',
  exactMatchOf: 'The origin item has an exact semantic match with the destination',
  precedes: 'The origin item should come before the destination (ordering)',
  isRelatedTo: 'The origin item is related to the destination (general relationship)',
  isTranslationOf: 'The destination item is a translation of the origin item',
}

export default function EdgePropertiesPanel({ edge, nodes, onClose, onChangeEdge, onFlipEdge }: Readonly<Props>) {
  const [copied, setCopied] = useState<null | 'uri'>(null)
  const [customType, setCustomType] = useState('')

  useEffect(() => {
    if (!edge) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [edge, onClose])

  const isItemNode = (n: CaseEditorNodeType): n is CaseItemNodeType => n.type === 'caseItemNode'
  const isFrameworkNode = (n: CaseEditorNodeType): n is CaseFrameworkNodeType => n.type === 'caseFrameworkNode'
  const isExternalFrameworkNode = (n: CaseEditorNodeType): n is ExternalFrameworkNodeType => n.type === 'externalFrameworkNode'
  const isAnyFrameworkNode = (n: CaseEditorNodeType | undefined): boolean => 
    n ? (isFrameworkNode(n) || isExternalFrameworkNode(n)) : false

  const sourceNode = useMemo(() => nodes.find((n) => n.id === edge?.source), [nodes, edge?.source])
  const targetNode = useMemo(() => nodes.find((n) => n.id === edge?.target), [nodes, edge?.target])
  
  // Check if edge connects to a framework node - constrain to isPartOf only
  const involvesFrameworkNode = isAnyFrameworkNode(sourceNode) || isAnyFrameworkNode(targetNode)
  const allowedAssociationTypes = involvesFrameworkNode 
    ? (['isPartOf'] as const)
    : CASE_ASSOCIATION_TYPES

  const getNodeLabel = (node: CaseEditorNodeType | undefined): string => {
    if (!node) return 'Unknown'
    if (isFrameworkNode(node)) {
      return node.data.cfDocument?.title ?? 'Framework'
    }
    if (isItemNode(node)) {
      return (
        node.data.cfItem?.humanCodingScheme ??
        node.data.cfItem?.alternativeLabel ??
        node.data.cfItem?.abbreviatedStatement ??
        'Item'
      )
    }
    return 'Unknown'
  }

  const cfAssociation = edge?.data?.cfAssociation
  const associationType = edge?.data?.associationType ?? cfAssociation?.associationType ?? 'isChildOf'
  const sequenceNumber = edge?.data?.sequenceNumber ?? cfAssociation?.sequenceNumber
  const isHierarchical = edge?.data?.isHierarchical ?? false

  const isStandardType = CASE_ASSOCIATION_TYPES.includes(associationType as typeof CASE_ASSOCIATION_TYPES[number])
  const isCustomType = !isStandardType && associationType !== ''

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  }

  const updateEdge = (patch: CaseEdgeDataPatch) => {
    if (!edge) return
    onChangeEdge?.(edge.id, patch)
  }

  const handleAssociationTypeChange = (newType: CaseAssociationType) => {
    updateEdge({
      associationType: newType,
      cfAssociation: { associationType: newType },
    })
  }

  const handleSequenceNumberChange = (value: string) => {
    const num = value === '' ? undefined : Number.parseInt(value, 10)
    if (value !== '' && Number.isNaN(num)) return
    updateEdge({
      sequenceNumber: num,
      cfAssociation: { sequenceNumber: num },
    })
  }

  const handleNotesChange = (notes: string) => {
    updateEdge({
      cfAssociation: { notes: notes || undefined },
    })
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
    } catch {
      // best-effort; ignore
    }
  }

  const isOpen = Boolean(edge)

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-20 flex h-screen w-[min(460px,92vw)] flex-col border-l border-black/10 bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-[-16px_0_40px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      aria-label="Association details"
    >
      <div className="flex items-center justify-between border-b border-black/10 bg-white/70 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-sm font-bold">Association details</div>
          <div className="text-xs text-slate-500">
            Define how two items are related.
          </div>
        </div>
        <Button variant="secondary" size="xs" onClick={() => onClose?.()}>
          Close
        </Button>
      </div>

      {edge ? (
        <div className="flex-1 overflow-auto p-4">
          {/* Connection summary */}
          <div className="mb-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-xs font-semibold text-slate-700">Association</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {ASSOCIATION_TYPE_LABELS[associationType] ?? associationType}
              </div>
              {isHierarchical && (
                <span className="mt-2 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Hierarchical
                </span>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-black/5 bg-slate-50/50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                  O
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Origin (source)</div>
                  <div className="text-sm font-medium text-slate-900">{getNodeLabel(sourceNode)}</div>
                </div>
              </div>
              <div className="ml-3 flex items-center gap-2 border-l-2 border-slate-200 py-1 pl-4">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
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
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                  D
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Destination (target)</div>
                  <div className="text-sm font-medium text-slate-900">{getNodeLabel(targetNode)}</div>
                </div>
              </div>
            </div>
            
            {/* Hint about dragging handles */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2">
              <svg className="h-4 w-4 shrink-0 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-violet-700">
                <span className="font-medium">Tip:</span> Drag the purple handles on the edge to reconnect to a different node.
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Association Type */}
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">Association Type</div>
                <div className="text-xs text-slate-500">
                  {involvesFrameworkNode 
                    ? 'Framework connections must use "Is Part Of".'
                    : 'How the origin item relates to the destination.'}
                </div>
              </div>

              <div className="space-y-2">
                {allowedAssociationTypes.map((type) => (
                  <label
                    key={type}
                    className={[
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                      associationType === type
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-black/10 hover:border-black/20 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="associationType"
                      value={type}
                      checked={associationType === type}
                      onChange={() => handleAssociationTypeChange(type)}
                      className="mt-0.5 h-4 w-4 text-violet-600 focus:ring-violet-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {ASSOCIATION_TYPE_LABELS[type]}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ASSOCIATION_TYPE_DESCRIPTIONS[type]}
                      </div>
                    </div>
                  </label>
                ))}

                {/* Custom type option */}
                <div
                  className={[
                    'rounded-xl border p-3 transition-colors',
                    isCustomType
                      ? 'border-violet-300 bg-violet-50'
                      : 'border-black/10',
                  ].join(' ')}
                >
                  <div className="mb-2 text-sm font-medium text-slate-900">Custom extension type</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={isCustomType ? associationType : customType}
                      onChange={(e) => {
                        if (isCustomType) {
                          handleAssociationTypeChange(e.target.value)
                        } else {
                          setCustomType(e.target.value)
                        }
                      }}
                      placeholder="ext:myCustomType"
                      className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    />
                    {!isCustomType && customType && (
                      <Button variant="secondary" size="xs" onClick={handleCustomTypeSubmit}>
                        Apply
                      </Button>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Use ext: prefix for custom association types
                  </div>
                </div>
              </div>
            </div>

            {/* Sequence Number */}
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">Sequence Number</div>
                <div className="text-xs text-slate-500">
                  Optional ordering for associations. Lower numbers appear first.
                </div>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={sequenceNumber ?? ''}
                onChange={(e) => handleSequenceNumberChange(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
              />
            </div>

            {/* Notes */}
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-2">
                <div className="text-sm font-semibold text-slate-900">Notes</div>
                <div className="text-xs text-slate-500">Optional context about this relationship.</div>
              </div>
              <textarea
                rows={3}
                value={cfAssociation?.notes ?? ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about this association..."
                className="w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
              />
            </div>

            {/* Technical details */}
            <details className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer select-none text-sm font-semibold text-slate-900">
                Technical details
                <span className="ml-2 text-xs font-normal text-slate-500">(IDs, URIs)</span>
              </summary>

              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-black/10 bg-slate-900/2 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">IDs and links</div>
                    {cfAssociation?.uri ? (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          if (!cfAssociation?.uri) return
                          void copyToClipboard(cfAssociation.uri)
                        }}
                        title="Copy URI"
                      >
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
                      <div
                        key={k}
                        className="grid grid-cols-[140px_1fr] gap-2 border-b border-black/5 py-1 last:border-b-0"
                      >
                        <div className="text-xs text-slate-600">{k}</div>
                        <div className="wrap-break-word font-mono text-xs text-slate-900">{String(v)}</div>
                      </div>
                    ))}
                </div>
              </div>
            </details>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
