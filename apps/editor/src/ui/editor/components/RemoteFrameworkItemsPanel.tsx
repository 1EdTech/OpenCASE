import { useCallback, useEffect, useState } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/solid'
import { Button } from '@/ui/shared/components/ui/button'
import { Input } from '@/ui/shared/components/ui/input'
import type { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
import type { CachedFrameworkItemSummary } from '@/infrastructure/caseApi/cgeTypes'
import type { ExternalFrameworkNodeType } from '@/ui/editor/reactflow/types'
import { REMOTE_ITEM_MIME, type RemoteItemDragPayload } from '@/ui/editor/remoteFramework/remoteFrameworkTypes'

type Props = {
  tenantId: string
  api: CaseApiClient
  linkedFrameworkNodes: ExternalFrameworkNodeType[]
  activeNodeId: string | null
  onSelectFramework: (nodeId: string) => void
  onClose: () => void
  onRefreshFramework?: () => Promise<void>
  onRemoveFramework?: () => void
  frameworkRefreshing?: boolean
  onOpenFrameworkSettings?: () => void
}

export default function RemoteFrameworkItemsPanel({
  tenantId,
  api,
  linkedFrameworkNodes,
  activeNodeId,
  onSelectFramework,
  onClose,
  onRefreshFramework,
  onRemoveFramework,
  frameworkRefreshing = false,
  onOpenFrameworkSettings,
}: Readonly<Props>) {
  const activeNode = linkedFrameworkNodes.find((n) => n.id === activeNodeId) ?? linkedFrameworkNodes[0] ?? null
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [items, setItems] = useState<CachedFrameworkItemSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => globalThis.clearTimeout(t)
  }, [query])

  const loadItems = useCallback(async () => {
    if (!activeNode?.data.cacheDocId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.searchCachedFrameworkItems({
        tenantId,
        docId: activeNode.data.cacheDocId,
        q: debouncedQuery || undefined,
        limit: 80,
      })
      setItems(res.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [api, tenantId, activeNode?.data.cacheDocId, debouncedQuery])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const onDragStart = (item: CachedFrameworkItemSummary) => (e: React.DragEvent) => {
    if (!activeNode) return
    const payload: RemoteItemDragPayload = {
      identifier: item.identifier,
      uri: item.uri,
      label: item.abbreviatedStatement ?? item.fullStatement ?? item.humanCodingScheme ?? item.identifier,
      humanCodingScheme: item.humanCodingScheme,
      remoteFrameworkRefId: activeNode.data.refId,
      remoteFrameworkNodeId: activeNode.id,
      remoteFrameworkTitle: activeNode.data.title,
      remoteFrameworkColor: activeNode.data.color,
    }
    e.dataTransfer.setData(REMOTE_ITEM_MIME, JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'link'
  }

  if (!activeNode) {
    return (
      <div className="p-4 text-sm text-slate-500">
        Add a remote framework to browse its items.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/10 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Remote items</h2>
            <p className="text-xs text-slate-500">Drag onto a local item to link</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {linkedFrameworkNodes.map((n) => (
            <button
              key={n.id}
              type="button"
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium text-white shadow-sm',
                n.id === activeNode.id ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-80',
              ].join(' ')}
              style={{ backgroundColor: n.data.color }}
              onClick={() => onSelectFramework(n.id)}
            >
              {n.data.title}
            </button>
          ))}
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter items…"
          className="mt-3"
        />

        {activeNode.data.cgeFrameworkId && (onRefreshFramework || onRemoveFramework || onOpenFrameworkSettings) ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {onOpenFrameworkSettings ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenFrameworkSettings}>
                <Cog6ToothIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Framework settings
              </Button>
            ) : null}
            {onRefreshFramework ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={frameworkRefreshing}
                onClick={() => void onRefreshFramework()}
              >
                {frameworkRefreshing ? 'Refreshing…' : 'Refresh cache'}
              </Button>
            ) : null}
            {onRemoveFramework ? (
              <Button type="button" variant="ghost" size="sm" className="text-rose-700" onClick={onRemoveFramework}>
                Remove from canvas
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No items match.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.identifier}
                draggable
                onDragStart={onDragStart(item)}
                className="cursor-grab rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm active:cursor-grabbing hover:border-violet-300"
              >
                {item.humanCodingScheme ? (
                  <div className="font-mono text-xs text-slate-500">{item.humanCodingScheme}</div>
                ) : null}
                <div className="text-slate-900">{item.abbreviatedStatement ?? item.fullStatement ?? item.identifier}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
