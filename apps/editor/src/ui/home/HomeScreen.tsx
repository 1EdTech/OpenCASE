import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/solid'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/shared/components/ui/dialog'

export default function HomeScreen({
  unsavedDrafts,
  onOpenFramework,
  onOpenRemoteFramework,
  onDeleteDraft,
  remoteOpenLoading,
  onCreateNew,
}: Readonly<{
  /** Locally-created frameworks that have not yet been saved to the server */
  unsavedDrafts: HomeFramework[]
  onOpenFramework: (_id: string) => void
  onOpenRemoteFramework?: (_docId: string) => Promise<void>
  onDeleteDraft?: (_id: string) => void
  remoteOpenLoading?: boolean
  onCreateNew: (_draft: CreateFrameworkDraft) => void
}>) {
  const [createOpen, setCreateOpen] = useState(false)
  const { status, tenantId, userName, signOut, getAccessToken } = useAuth()
  const cfg = getAppConfig()

  const api = useMemo(() => new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl, { getAccessToken })), [cfg.opencaseBaseUrl, getAccessToken])

  // Server frameworks state
  const [serverFrameworks, setServerFrameworks] = useState<CfDocumentSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Delete confirmation state (for server frameworks)
  const [deleteConfirm, setDeleteConfirm] = useState<{ docId: string; title: string } | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  // Delete confirmation state (for unsaved drafts)
  const [draftDeleteConfirm, setDraftDeleteConfirm] = useState<{ id: string; title: string } | null>(null)

  // Load frameworks from server
  const loadFrameworks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const docs = await api.listCfDocuments({ caseVersion: 'v1p1' })
      setServerFrameworks(docs)
      setHasLoadedOnce(true)
    } catch (e: unknown) {
      setServerFrameworks([])
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [api])

  // Auto-load when authenticated
  useEffect(() => {
    if (status === 'authenticated' && !hasLoadedOnce && !loading) {
      void loadFrameworks()
    }
  }, [status, hasLoadedOnce, loading, loadFrameworks])

  const openRemote = useCallback(
    (docId: string) => {
      if (!onOpenRemoteFramework) return
      setError(null)
      void onOpenRemoteFramework(docId).catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e))
      })
    },
    [onOpenRemoteFramework],
  )

  // Handle server framework delete (archive)
  const handleDeleteRequest = useCallback((docId: string, title: string) => {
    setDeleteConfirm({ docId, title })
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm || !tenantId) return

    setDeletingDocId(deleteConfirm.docId)
    setDeleteConfirm(null)
    setError(null)

    try {
      await api.deleteCfPackage({
        tenantId,
        docId: deleteConfirm.docId,
        caseVersion: 'v1p1',
      })

      // Remove from local list
      setServerFrameworks((prev) => prev.filter((f) => f.identifier !== deleteConfirm.docId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingDocId(null)
    }
  }, [api, deleteConfirm, tenantId])

  // Handle unsaved draft delete
  const handleDraftDeleteConfirm = useCallback(() => {
    if (!draftDeleteConfirm || !onDeleteDraft) return
    onDeleteDraft(draftDeleteConfirm.id)
    setDraftDeleteConfirm(null)
  }, [draftDeleteConfirm, onDeleteDraft])

  const isAuthenticated = status === 'authenticated'
  const refreshButtonClass = loading ? 'animate-spin' : ''

  // IDs of server frameworks, used to exclude drafts that have since been saved
  const serverIds = useMemo(() => new Set(serverFrameworks.map((f) => f.identifier)), [serverFrameworks])

  // Unsaved drafts that haven't been saved to the server yet
  const visibleDrafts = useMemo(
    () => unsavedDrafts.filter((d) => !serverIds.has(d.id)),
    [unsavedDrafts, serverIds],
  )

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

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => void loadFrameworks()}
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshButtonClass}`} />
                {loading ? 'Loading…' : 'Refresh'}
              </Button>
            )}

            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              Create framework
            </Button>
          </div>
        </div>

        {/* Unsaved Drafts */}
        {visibleDrafts.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Unsaved Drafts</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {visibleDrafts.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              New frameworks not yet saved to the server. Open to edit, then save to publish.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleDrafts.map((fw) => (
                <FrameworkCard
                  key={fw.id}
                  cfDocument={fw.cfDocument}
                  rightHint="Open to edit"
                  onClick={() => onOpenFramework(fw.id)}
                  onDelete={
                    onDeleteDraft
                      ? () => setDraftDeleteConfirm({ id: fw.id, title: fw.cfDocument.title ?? 'Untitled' })
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Server Frameworks */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Frameworks</h2>

          {!isAuthenticated && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Sign in to view frameworks from OpenCASE.
            </div>
          )}

          {isAuthenticated && error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {isAuthenticated && loading && !hasLoadedOnce && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Loading frameworks…
            </div>
          )}

          {isAuthenticated && !loading && hasLoadedOnce && serverFrameworks.length === 0 && !error && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              No frameworks found. Create a new framework to get started.
            </div>
          )}

          {isAuthenticated && serverFrameworks.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {serverFrameworks.map((doc) => {
                const title = doc.title ?? doc.identifier ?? 'Untitled Framework'
                const hint = remoteOpenLoading ? 'Loading…' : 'Open'
                const isDeleting = deletingDocId === doc.identifier
                const cardClass = remoteOpenLoading || isDeleting ? 'opacity-60 pointer-events-none' : undefined
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
                    rightHint={isDeleting ? 'Archiving…' : hint}
                    onClick={() => openRemote(doc.identifier)}
                    onDelete={tenantId ? () => handleDeleteRequest(doc.identifier, title) : undefined}
                    deleteDisabled={isDeleting || remoteOpenLoading}
                    className={cardClass}
                  />
                )
              })}
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

      {/* Archive Confirmation Dialog (server frameworks) */}
      <Dialog open={Boolean(deleteConfirm)} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Framework</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive &ldquo;{deleteConfirm?.title}&rdquo;?
              The framework will be archived on the server and can be restored by an administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteConfirm()}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (unsaved drafts) */}
      <Dialog open={Boolean(draftDeleteConfirm)} onOpenChange={(open) => !open && setDraftDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Draft</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{draftDeleteConfirm?.title}&rdquo;?
              This draft has not been saved to the server and will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDraftDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDraftDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
