import { Handle, Position, type NodeProps, NodeResizer, useReactFlow, useConnection } from '@xyflow/react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import type { CaseItemNodeType } from '../types'
import type { CaseEditorNodeType } from '@/ui/editor/reactflow/types'
import { useEditor } from '@/ui/editor/state/EditorContext'
import RemoteLinkPopover from '@/ui/editor/components/RemoteLinkPopover'

export default function CaseItemNode({ id, data, selected }: NodeProps<CaseItemNodeType>) {
  const rf = useReactFlow<CaseEditorNodeType>()
  const { remoteLinks, removeRemoteLink } = useEditor()
  const itemRemoteLinks = remoteLinks.filter((l) => l.localItemId === id)
  const [activePopover, setActivePopover] = useState<{ linkId: string; rect: DOMRect } | null>(null)
  const popoverLink = activePopover ? itemRemoteLinks.find((l) => l.id === activePopover.linkId) : undefined
  
  // Get connection state to show visual feedback during drag (React Flow v12+)
  const connection = useConnection()
  const connectionInProgress = connection.inProgress
  const connectionNodeId = connection.fromNode?.id ?? null
  
  // Check if the node being dragged from is a framework
  const sourceNodeType = connection.fromNode?.type
  const isSourceFramework = sourceNodeType === 'caseFrameworkNode' || sourceNodeType === 'externalFrameworkNode'
  
  // This item is a valid target when dragging from a framework (show positive feedback)
  const isValidTarget = connectionInProgress && isSourceFramework && connectionNodeId !== id

  // Defensive typing: React Flow's NodeProps typing can lag behind our node-data evolution.
  // Runtime `data` is shaped by `App.tsx` and always includes `cfItem` for CASE item nodes.
  const typedData = data as unknown as {
    cfItem?: {
      fullStatement?: string
      abbreviatedStatement?: string
      alternativeLabel?: string
      humanCodingScheme?: string
      CFItemType?: string
      subject?: string[]
      educationLevel?: string[]
      conceptKeywords?: string[]
      colorBand?: string
    }
    onAddChild?: (_parentId: string) => void
  }

  const statement = typedData?.cfItem?.abbreviatedStatement ?? typedData?.cfItem?.fullStatement ?? ''
  const altLabel = typedData?.cfItem?.alternativeLabel
  const code = typedData?.cfItem?.humanCodingScheme
  const itemType = typedData?.cfItem?.CFItemType
  const subjects = typedData?.cfItem?.subject ?? []
  const subject = subjects[0]
  const extraSubjectCount = subjects.length > 1 ? subjects.length - 1 : 0
  const educationLevel = typedData?.cfItem?.educationLevel?.slice(0, 2) ?? []
  const keywords = typedData?.cfItem?.conceptKeywords?.slice(0, 3) ?? []
  const colorBand = typedData?.cfItem?.colorBand

  return (
    <div
      className={[
        'group relative flex min-h-full w-full flex-col rounded-lg border bg-white shadow-sm transition-all hover:shadow-md',
        selected ? 'border-[#662F90] shadow-md ring-2 ring-[#662F90]/15' : 'border-gray-200',
        isValidTarget ? 'border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg shadow-emerald-100' : '',
      ].join(' ')}
    >
      {/* Header bar — thicker with type label when present, thin accent otherwise */}
      {itemType ? (
        <div className="flex w-full items-center justify-end rounded-t-lg bg-linear-to-r from-[#000072]/70 to-[#662F90]/70 px-2.5 py-1">
          <span className="truncate text-[11px] font-semibold leading-tight text-white/90">
            {itemType}
          </span>
        </div>
      ) : (
        <div className="h-[3px] w-full rounded-t-lg bg-linear-to-r from-[#000072]/50 to-[#662F90]/50" />
      )}

      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={280}
        minHeight={160}
        maxWidth={720}
        maxHeight={520}
        lineStyle={{ borderColor: 'transparent' }}
        handleStyle={{ 
          width: 8, 
          height: 8, 
          borderRadius: 4, 
          backgroundColor: '#662F90',
          borderColor: 'white',
          borderWidth: 2,
        }}
      />

      <div
        className={[
          'nodrag nopan absolute left-full top-2 ml-2 flex flex-col gap-2 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        ].join(' ')}
      >
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#662F90]/30 bg-white px-3 py-1 text-xs font-semibold text-[#662F90] shadow-sm hover:bg-[#662F90]/5 focus-visible:outline-2 focus-visible:outline-[#662F90]/40 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            typedData?.onAddChild?.(id)
          }}
          aria-label="Add child item"
          title="Add child item"
        >
          <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Add item
        </button>

        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700/40 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            const node = rf.getNode(id)
            if (!node) return
            rf.deleteElements({ nodes: [node], edges: [] })
          }}
          aria-label="Remove item"
          title="Remove item"
        >
          <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Optional color band stripe with padding and rounded ends */}
        {colorBand ? (
          <div className="flex shrink-0 items-stretch py-2 pl-2">
            <div
              className="w-[5px] rounded-full"
              style={{ backgroundColor: colorBand }}
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1 px-3 py-2">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {code ? (
                  <div className="rounded-md bg-[#000072]/8 px-1.5 py-0.5 text-[11px] font-semibold text-[#000072]">
                    {code}
                  </div>
                ) : null}
                {subject ? (
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                    {subject}{extraSubjectCount > 0 ? ` +${extraSubjectCount}` : ''}
                  </div>
                ) : null}
                {educationLevel.length ? (
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                    {educationLevel.join(' • ')}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {altLabel ? (
            /* Short label takes priority — larger and prominent */
            <div className="text-sm font-medium leading-snug text-[#2E2F2F]">
              <div className="line-clamp-4">{altLabel}</div>
            </div>
          ) : statement ? (
            <div className="text-sm leading-snug text-[#2E2F2F]">
              <div className="line-clamp-5">{statement}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">No statement yet</div>
          )}

          {keywords.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {keywords.map((k, idx) => (
                <div
                  key={`${idx}-${k}`}
                  className="rounded-full border border-[#662F90]/15 bg-[#662F90]/5 px-2 py-0.5 text-[10px] font-medium text-[#662F90]"
                  title={k}
                >
                  {k}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Bidirectional handles on all four sides - graph style connections */}
      <Handle
        id="top"
        position={Position.Top}
        type="source"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`h-2.5! w-2.5! rounded-full! border-2! transition-colors ${
          isValidTarget
            ? 'border-emerald-500! bg-emerald-100! scale-125!'
            : 'border-gray-300! bg-gray-100! hover:border-[#662F90]! hover:bg-[#662F90]/10!'
        }`}
      />
      <Handle
        id="bottom"
        position={Position.Bottom}
        type="source"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`h-2.5! w-2.5! rounded-full! border-2! transition-colors ${
          isValidTarget
            ? 'border-emerald-500! bg-emerald-100! scale-125!'
            : 'border-gray-300! bg-gray-100! hover:border-[#662F90]! hover:bg-[#662F90]/10!'
        }`}
      />
      <Handle
        id="left"
        position={Position.Left}
        type="source"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`h-2.5! w-2.5! rounded-full! border-2! transition-colors ${
          isValidTarget
            ? 'border-emerald-500! bg-emerald-100! scale-125!'
            : 'border-gray-300! bg-gray-100! hover:border-[#662F90]! hover:bg-[#662F90]/10!'
        }`}
      />
      <Handle
        id="right"
        position={Position.Right}
        type="source"
        isConnectableStart={true}
        isConnectableEnd={true}
        className={`h-2.5! w-2.5! rounded-full! border-2! transition-colors ${
          isValidTarget
            ? 'border-emerald-500! bg-emerald-100! scale-125!'
            : 'border-gray-300! bg-gray-100! hover:border-[#662F90]! hover:bg-[#662F90]/10!'
        }`}
      />

      {itemRemoteLinks.length > 0 ? (
        <div className="flex w-full flex-col gap-px rounded-b-lg overflow-hidden">
          {itemRemoteLinks.map((link) => {
            const itemTitle = link.remoteLabel || link.remoteHumanCodingScheme || 'Remote item'
            const itemCode = link.remoteHumanCodingScheme
            const showCode = Boolean(itemCode && itemCode !== itemTitle)
            return (
              <div key={link.id} className="relative">
                <button
                  type="button"
                  className="nodrag nopan flex min-h-5 w-full items-center gap-1.5 px-2 py-0.5 text-left text-[10px] leading-tight text-white hover:brightness-95"
                  style={{ backgroundColor: link.remoteFrameworkColor ?? '#64748b' }}
                  title={`${itemTitle}${showCode ? ` (${itemCode})` : ''}${link.remoteFrameworkTitle ? ` — ${link.remoteFrameworkTitle}` : ''} (${link.associationType})`}
                  onClick={(e) => {
                    e.stopPropagation()
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setActivePopover({ linkId: link.id, rect })
                  }}
                >
                  <span className="min-w-0 flex-1 truncate font-semibold">{itemTitle}</span>
                  {showCode ? (
                    <>
                      <span className="shrink-0 opacity-70">·</span>
                      <span className="shrink-0 truncate font-mono font-medium">{itemCode}</span>
                    </>
                  ) : null}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}

      {popoverLink && activePopover ? (
        <RemoteLinkPopover
          link={popoverLink}
          anchorRect={activePopover.rect}
          onClose={() => setActivePopover(null)}
          onRemove={() => {
            removeRemoteLink(popoverLink.id)
            setActivePopover(null)
          }}
        />
      ) : null}

      <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        Select to edit
      </div>
    </div>
  )
}

