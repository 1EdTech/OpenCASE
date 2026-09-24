import { Handle, Position, type NodeProps, NodeResizer, useConnection } from '@xyflow/react'
import { Cog6ToothIcon, LinkIcon, XMarkIcon } from '@heroicons/react/24/solid'
import type { ExternalFrameworkNodeType } from '../types'

export default function ExternalFrameworkNode({ id, data, selected }: NodeProps<ExternalFrameworkNodeType>) {
  const connection = useConnection()
  const connectionInProgress = connection.inProgress
  const connectionNodeId = connection.fromNode?.id ?? null
  
  const sourceNodeType = connection.fromNode?.type
  const isSourceFramework = sourceNodeType === 'caseFrameworkNode' || sourceNodeType === 'externalFrameworkNode'
  const isInvalidTarget = connectionInProgress && isSourceFramework && connectionNodeId !== id

  const typedData = data as unknown as {
    title?: string
    uri?: string
    description?: string
    source?: string
    color?: string
    itemCount?: number
    cachedAt?: string
    cacheDocId?: string
    cacheError?: string | null
    cacheLoading?: boolean
    onRemoveRemoteFramework?: (_nodeId: string) => void
    onOpenExternalFrameworkSettings?: (_nodeId: string) => void
  }

  const title = typedData?.title ?? 'Remote Framework'
  const uri = typedData?.uri
  const description = typedData?.description
  const source = typedData?.source
  const color = typedData?.color ?? '#64748b'
  const hasCacheError = Boolean(typedData?.cacheError)
  const isUncached = !typedData?.cacheDocId
  const borderColor = hasCacheError ? '#f87171' : color

  return (
    <div className="group relative h-full w-full">
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={280}
        minHeight={120}
        maxWidth={600}
        maxHeight={400}
        lineStyle={{ borderColor: 'transparent' }}
        handleStyle={{ 
          width: 8, 
          height: 8, 
          borderRadius: 4, 
          backgroundColor: color,
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
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-700/40 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            typedData.onOpenExternalFrameworkSettings?.(id)
          }}
          aria-label="Framework settings"
          title="Framework settings"
        >
          <Cog6ToothIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Settings
        </button>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700/40 focus-visible:outline-offset-2"
          onClick={(e) => {
            e.stopPropagation()
            typedData.onRemoveRemoteFramework?.(id)
          }}
          aria-label="Remove remote framework"
          title="Remove remote framework"
        >
          <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </button>
      </div>

      <div
        className={[
          'relative flex h-full w-full flex-col rounded-xl border-2 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-all',
          selected ? 'shadow-md ring-2 ring-offset-1' : '',
          isInvalidTarget ? 'opacity-40 grayscale ring-2 ring-red-300' : '',
        ].join(' ')}
        style={{ borderColor: borderColor, ...(selected ? { ringColor: `${borderColor}33` } : {}) }}
      >
        {isInvalidTarget && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-red-50/50">
            <div className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
              Cannot link frameworks
            </div>
          </div>
        )}
        
        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: color }}>
            <LinkIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">{title}</div>
            {source ? (
              <div className="truncate text-xs text-slate-500">{source}</div>
            ) : null}
          </div>
        </div>

        {description ? (
          <p className="mb-2 line-clamp-2 text-xs text-slate-600">{description}</p>
        ) : null}

        {typedData.cacheLoading ? (
          <div className="text-xs text-slate-500">Downloading cache…</div>
        ) : hasCacheError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
            Cache unavailable — open settings to retry
          </div>
        ) : typedData.itemCount != null ? (
          <div className="text-xs text-slate-500">{typedData.itemCount} items cached</div>
        ) : isUncached ? (
          <div className="text-xs text-amber-700">Not cached — open settings to download</div>
        ) : null}

        {uri ? (
          <div className="mt-auto truncate rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-500">
            {uri}
          </div>
        ) : null}

        <div className="absolute right-3 top-3">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: hasCacheError ? '#dc2626' : isUncached ? '#d97706' : color }}
          >
            {hasCacheError ? 'Error' : isUncached ? 'Uncached' : 'Remote'}
          </span>
        </div>

        {!selected && !isInvalidTarget && (
          <div className="absolute bottom-2 right-3 text-xs text-slate-400">
            Click for properties · double-click to browse
          </div>
        )}

        {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
          <Handle
            key={side}
            id={side}
            position={side === 'top' ? Position.Top : side === 'bottom' ? Position.Bottom : side === 'left' ? Position.Left : Position.Right}
            type="source"
            isConnectableStart={true}
            isConnectableEnd={!isInvalidTarget}
            className="!h-2.5 !w-2.5 !rounded-full !border-2 transition-colors"
            style={{
              borderColor: isInvalidTarget ? '#fca5a5' : color,
              backgroundColor: isInvalidTarget ? '#fee2e2' : `${color}22`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
