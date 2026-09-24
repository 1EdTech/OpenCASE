import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Input } from '@/ui/shared/components/ui/input'
import type { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
import { normalizeCgeFrameworkList, normalizeCgeSubscriptionList } from '@/infrastructure/caseApi/CaseApiClient'
import type { CgeFrameworkSummary } from '@/infrastructure/caseApi/cgeTypes'
import { formatApiErrorMessage } from '@/infrastructure/caseApi/http'

type Props = {
  tenantId: string
  api: CaseApiClient
  onClose: () => void
  onAddToCanvas: (framework: CgeFrameworkSummary) => Promise<void>
}

export default function CgeFrameworkSearchPanel({ tenantId, api, onClose, onAddToCanvas }: Readonly<Props>) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [frameworks, setFrameworks] = useState<CgeFrameworkSummary[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    const t = globalThis.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => globalThis.clearTimeout(t)
  }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fwRes, subRes] = await Promise.all([
        api.listCgeFrameworks({ tenantId, search: debouncedQuery || undefined, limit: 30 }),
        api.listCgeSubscriptions({ tenantId }).catch(() => null),
      ])
      const list = normalizeCgeFrameworkList(fwRes)
      const subs = normalizeCgeSubscriptionList(subRes)
      const subSet = new Set(subs.map((s) => s.frameworkId))
      for (const f of list) {
        if (f.subscribed) subSet.add(f.frameworkId)
      }
      setFrameworks(list)
      setSubscribedIds(subSet)
    } catch (e) {
      setError(formatApiErrorMessage(e, 'Search failed'))
      setFrameworks([])
    } finally {
      setLoading(false)
    }
  }, [api, tenantId, debouncedQuery])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubscribe = async (frameworkId: string) => {
    setBusyId(frameworkId)
    setError(null)
    try {
      await api.createCgeSubscription({ tenantId, frameworkId })
      setSubscribedIds((prev) => new Set(prev).add(frameworkId))
    } catch (e) {
      setError(formatApiErrorMessage(e, 'Subscribe failed'))
    } finally {
      setBusyId(null)
    }
  }

  const handleAdd = async (fw: CgeFrameworkSummary) => {
    setAddingId(fw.frameworkId)
    setError(null)
    try {
      await onAddToCanvas(fw)
    } catch (e) {
      setError(formatApiErrorMessage(e, 'Add to canvas failed'))
    } finally {
      setAddingId(null)
    }
  }

  const rows = useMemo(() => frameworks, [frameworks])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/10 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Add remote framework</h2>
            <p className="text-xs text-slate-500">Search CASE Global registered frameworks</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search frameworks…"
          className="mt-3"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error ? (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {loading ? (
          <p className="text-sm text-slate-500">Searching…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No frameworks found.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((fw) => {
              const subscribed = subscribedIds.has(fw.frameworkId)
              return (
                <li key={fw.frameworkId} className="rounded-xl border border-black/10 bg-white p-3 shadow-sm">
                  <div className="font-medium text-slate-900">{fw.title}</div>
                  {fw.publisher ? <div className="text-xs text-slate-500">{fw.publisher}</div> : null}
                  {fw.version ? <div className="text-xs text-slate-400">v{fw.version}</div> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {subscribed ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Subscribed</span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === fw.frameworkId}
                        onClick={() => void handleSubscribe(fw.frameworkId)}
                      >
                        Subscribe
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={!subscribed || addingId === fw.frameworkId}
                      onClick={() => void handleAdd(fw)}
                    >
                      Add to canvas
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
