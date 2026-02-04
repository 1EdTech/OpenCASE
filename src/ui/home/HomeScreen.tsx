import { PlusIcon, CloudArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/solid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { FrameworkCard } from '@/ui/shared/components/FrameworkCard'
import type { HomeFramework } from '@/ui/home/frameworkStore'
import CreateFrameworkDialog, { type CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'
import { useAuth } from '@/app/providers/AuthProvider'
import { getAppConfig } from '@/app/config'
import { CaseApiClient, type CfDocumentSummary } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient } from '@/infrastructure/caseApi/http'
import CanvasHeader from '@/ui/editor/components/CanvasHeader'

function OpenCaseFrameworksContent({
  isAuthenticated,
  isLoading,
  hasLoadedOnce,
  error,
  frameworks,
  remoteOpenLoading,
  onOpenRemote,
}: Readonly<{
  isAuthenticated: boolean
  isLoading: boolean
  hasLoadedOnce: boolean
  error: string | null
  frameworks: CfDocumentSummary[]
  remoteOpenLoading?: boolean
  onOpenRemote: (docId: string) => void
}>) {
  if (!isAuthenticated) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Sign in to view frameworks from OpenCASE.
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    )
  }

  if (isLoading && !hasLoadedOnce) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
        <ArrowPathIcon className="h-4 w-4 animate-spin" />
        Loading frameworks from OpenCASE…
      </div>
    )
  }

  if (frameworks.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        No frameworks found in OpenCASE.
      </div>
    )
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {frameworks.map((doc) => {
        const title = doc.title ?? doc.identifier ?? 'Untitled Framework'
        const hint = remoteOpenLoading ? 'Loading…' : 'Open from OpenCASE'
        const cardClass = remoteOpenLoading ? 'opacity-60 pointer-events-none' : undefined
        return (
          <FrameworkCard
            key={doc.identifier}
            cfDocument={{
              title,
              creator: doc.creator ?? 'Unknown',
              description: doc.description,
              frameworkType: doc.frameworkType,
              adoptionStatus: doc.adoptionStatus,
            }}
            rightHint={hint}
            onClick={() => onOpenRemote(doc.identifier)}
            className={cardClass}
          />
        )
      })}
    </div>
  )
}

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
  const { status, tenantId, userName, signOut, getAccessToken } = useAuth()
  const cfg = getAppConfig()

  const api = useMemo(() => new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl, { getAccessToken })), [cfg.opencaseBaseUrl, getAccessToken])

  // OpenCASE frameworks state
  const [openCaseFrameworks, setOpenCaseFrameworks] = useState<CfDocumentSummary[]>([])
  const [openCaseLoading, setOpenCaseLoading] = useState(false)
  const [openCaseError, setOpenCaseError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Load OpenCASE frameworks
  const loadOpenCaseFrameworks = useCallback(async () => {
    setOpenCaseLoading(true)
    setOpenCaseError(null)
    try {
      const docs = await api.listCfDocuments({ caseVersion: 'v1p1' })
      setOpenCaseFrameworks(docs)
      setHasLoadedOnce(true)
    } catch (e: unknown) {
      setOpenCaseFrameworks([])
      setOpenCaseError(e instanceof Error ? e.message : String(e))
    } finally {
      setOpenCaseLoading(false)
    }
  }, [api])

  // Auto-load when authenticated
  useEffect(() => {
    if (status === 'authenticated' && !hasLoadedOnce && !openCaseLoading) {
      void loadOpenCaseFrameworks()
    }
  }, [status, hasLoadedOnce, openCaseLoading, loadOpenCaseFrameworks])

  const openRemote = useCallback(
    (docId: string) => {
      if (!onOpenRemoteFramework) return
      setOpenCaseError(null)
      void onOpenRemoteFramework(docId).catch((e: unknown) => {
        setOpenCaseError(e instanceof Error ? e.message : String(e))
      })
    },
    [onOpenRemoteFramework],
  )

  const isAuthenticated = status === 'authenticated'
  const refreshButtonClass = openCaseLoading ? 'animate-spin' : ''

  return (
    <div className="relative min-h-screen w-full bg-slate-50">
      <CanvasHeader
        frameworkTitle="CASE Editor"
        frameworkSubtitle="Home"
        userName={userName ?? undefined}
        tenantId={tenantId ?? undefined}
        reserveRightForPanel={false}
        onSignOut={isAuthenticated ? () => void signOut() : undefined}
      />

      <div className="mx-auto w-full max-w-6xl px-5 pb-8 pt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Open a framework to create, edit, and publish.</div>

          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" aria-hidden />
            Create framework
          </Button>
        </div>

        {/* OpenCASE Frameworks Section */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <CloudArrowDownIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">OpenCASE Frameworks</h2>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                disabled={openCaseLoading}
                onClick={() => void loadOpenCaseFrameworks()}
                className="ml-auto"
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshButtonClass}`} />
                {openCaseLoading ? 'Loading…' : 'Refresh'}
              </Button>
            )}
          </div>

          <OpenCaseFrameworksContent
            isAuthenticated={isAuthenticated}
            isLoading={openCaseLoading}
            hasLoadedOnce={hasLoadedOnce}
            error={openCaseError}
            frameworks={openCaseFrameworks}
            remoteOpenLoading={remoteOpenLoading}
            onOpenRemote={openRemote}
          />
        </div>

        {/* Local Frameworks Section */}
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Local Frameworks</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">{frameworks.length}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Drafts and recently opened frameworks stored locally.</p>

          {frameworks.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              No local frameworks yet. Create a new framework or open one from OpenCASE.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {frameworks.map((fw) => (
                <FrameworkCard
                  key={fw.id}
                  cfDocument={fw.cfDocument}
                  rightHint="Open to edit"
                  onClick={() => onOpenFramework(fw.id)}
                />
              ))}
            </div>
          )}
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
