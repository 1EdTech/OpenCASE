import { PlusIcon } from '@heroicons/react/24/solid'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { FrameworkCard } from '@/ui/shared/components/FrameworkCard'
import type { HomeFramework } from '@/ui/home/frameworkStore'
import CreateFrameworkDialog, { type CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'
import { useAuth } from '@/app/providers/AuthProvider'
import { getAppConfig } from '@/app/config'
import { CaseApiClient, type OpenCaseManagementCfPackageSummary } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient } from '@/infrastructure/caseApi/http'

export default function HomeScreen({
  frameworks,
  onOpenFramework,
  onOpenRemoteFramework,
  remoteOpenLoading,
  onCreateNew,
}: Readonly<{
  frameworks: HomeFramework[]
  onOpenFramework: (_id: string) => void
  onOpenRemoteFramework?: (_docId: string) => Promise<void>
  remoteOpenLoading?: boolean
  onCreateNew: (_draft: CreateFrameworkDraft) => void
}>) {
  const [createOpen, setCreateOpen] = useState(false)
  const { status, tenantId, setTenantId, userName, signIn, signOut, getAccessToken } = useAuth()
  const cfg = getAppConfig()

  const api = useMemo(() => new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl, { getAccessToken })), [cfg.opencaseBaseUrl, getAccessToken])

  const [remotePackages, setRemotePackages] = useState<OpenCaseManagementCfPackageSummary[]>([])
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)

  const loadRemotePackages = useCallback(async () => {
    setRemoteLoading(true)
    setRemoteError(null)
    try {
      const list = await api.listManagementCfPackages({ tenantId, caseVersion: '1.1' })
      setRemotePackages(list)
    } catch (e: unknown) {
      setRemotePackages([])
      setRemoteError(e instanceof Error ? e.message : String(e))
    } finally {
      setRemoteLoading(false)
    }
  }, [api, tenantId])

  const openRemote = useCallback(
    async (docId: string) => {
      if (!onOpenRemoteFramework) return
      setRemoteError(null)
      try {
        await onOpenRemoteFramework(docId)
      } catch (e: unknown) {
        setRemoteError(e instanceof Error ? e.message : String(e))
      }
    },
    [onOpenRemoteFramework],
  )

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">CASE Editor</div>
            <div className="text-sm text-slate-600">Open a framework to create, edit, and publish.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2">
              <div className="text-xs font-semibold text-slate-700">Tenant</div>
              <input
                className="w-28 rounded-md border border-black/10 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-2 focus:outline-violet-700/30"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="demo"
              />
            </div>

            <Button
              variant="secondary"
              onClick={() => {
                if (status === 'authenticated') void signOut()
                else void signIn(tenantId)
              }}
            >
              {status === 'authenticated' ? 'Sign out' : 'Sign in'}
            </Button>

            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              Create framework
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <div className="rounded-full border border-black/10 bg-white px-3 py-1">
            {status === 'authenticated' ? `Signed in${userName ? ` as ${userName}` : ''}` : status === 'loading' ? 'Auth: loading…' : 'Not signed in'}
          </div>

          <Button
            variant="secondary"
            disabled={status !== 'authenticated' || remoteLoading}
            onClick={() => {
              void loadRemotePackages()
            }}
          >
            {remoteLoading ? 'Loading backend frameworks…' : 'Load frameworks from OpenCASE'}
          </Button>

          <div className="text-xs text-slate-500">API: {cfg.opencaseBaseUrl}</div>
        </div>

        {remoteError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{remoteError}</div>
        ) : null}

        {remotePackages.length ? (
          <div className="mt-6">
            <div className="text-sm font-semibold text-slate-900">OpenCASE frameworks</div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {remotePackages
                .map((p) => ({
                  docId: (p.sourcedId ?? p.identifier ?? '').toString(),
                  title: (p.title ?? '').toString() || (p.sourcedId ?? p.identifier ?? 'Untitled').toString(),
                  caseVersion: (p.caseVersion ?? '').toString(),
                }))
                .filter((x) => Boolean(x.docId))
                .map((p) => (
                  <FrameworkCard
                    key={p.docId}
                    cfDocument={{
                      title: p.title,
                      creator: 'OpenCASE',
                      description: p.caseVersion ? `CASE ${p.caseVersion}` : undefined,
                      frameworkType: undefined,
                      adoptionStatus: undefined,
                    }}
                    rightHint={remoteOpenLoading ? 'Loading…' : 'Open from backend'}
                    onClick={() => void openRemote(p.docId)}
                    className={remoteOpenLoading ? 'opacity-60' : undefined}
                  />
                ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((fw) => (
            <FrameworkCard
              key={fw.id}
              cfDocument={fw.cfDocument}
              rightHint="Open to edit"
              onClick={() => onOpenFramework(fw.id)}
            />
          ))}
        </div>
      </div>

      <CreateFrameworkDialog
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreate={(draft) => {
          setCreateOpen(false)
          onCreateNew(draft)
        }}
      />
    </div>
  )
}

