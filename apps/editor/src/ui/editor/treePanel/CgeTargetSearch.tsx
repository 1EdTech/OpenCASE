import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Input } from '@/ui/shared/components/ui/input'
import type { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
import { normalizeCgeFrameworkList, normalizeCgeSubscriptionList } from '@/infrastructure/caseApi/CaseApiClient'
import type { CgeFrameworkSummary } from '@/infrastructure/caseApi/cgeTypes'
import { formatApiErrorMessage } from '@/infrastructure/caseApi/http'

type Props = {
  tenantId: string
  api: CaseApiClient
  /** Caches the framework on this server (read-only) and adds it as a target. */
  onAdd: (framework: CgeFrameworkSummary) => Promise<void>
}

/**
 * The CASE Global section of the Add Target Framework picker: search the coalition's
 * registered frameworks, subscribe to one, and add a subscribed one as a target.
 */
export default function CgeTargetSearch({ tenantId, api, onAdd }: Readonly<Props>) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [frameworks, setFrameworks] = useState<CgeFrameworkSummary[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

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
      const subscribed = new Set(normalizeCgeSubscriptionList(subRes).map((s) => s.frameworkId))
      for (const f of list) {
        if (f.subscribed) subscribed.add(f.frameworkId)
      }
      setFrameworks(list)
      setSubscribedIds(subscribed)
    } catch (e) {
      setError(formatApiErrorMessage(e, 'CASE Global search failed'))
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

  const handleAdd = async (framework: CgeFrameworkSummary) => {
    setBusyId(framework.frameworkId)
    setError(null)
    try {
      await onAdd(framework)
    } catch (e) {
      setError(formatApiErrorMessage(e, 'Could not add the framework'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search CASE Global…"
        autoFocus
      />
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {loading ? (
        <p className="px-1 py-4 text-center text-xs text-slate-400">Searching…</p>
      ) : frameworks.length === 0 ? (
        <p className="px-1 py-4 text-center text-xs text-slate-400">No frameworks found.</p>
      ) : (
        <ul className="flex flex-col">
          {frameworks.map((fw) => {
            const subscribed = subscribedIds.has(fw.frameworkId)
            const busy = busyId === fw.frameworkId
            return (
              <li key={fw.frameworkId} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-700">{fw.title}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {[fw.publisher, fw.version ? `v${fw.version}` : null].filter(Boolean).join(' · ') || 'CASE Global'}
                  </span>
                </span>
                {subscribed ? (
                  <Button type="button" size="sm" disabled={busy} onClick={() => void handleAdd(fw)}>
                    {busy ? 'Adding…' : 'Add'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    title="Subscribe to add this framework as a target"
                    onClick={() => void handleSubscribe(fw.frameworkId)}
                  >
                    Subscribe
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
