import { PlusIcon, ArrowPathIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon, ArrowRightStartOnRectangleIcon, CloudArrowDownIcon } from '@heroicons/react/24/solid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { FrameworkCard } from '@/ui/shared/components/FrameworkCard'
import type { HomeFramework } from '@/ui/home/frameworkStore'
import CreateFrameworkDialog, { type CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'
import ImportFrameworkDialog from '@/ui/home/ImportFrameworkDialog'
import { useAuth } from '@/app/providers/AuthProvider'
import { getAppConfig } from '@/app/config'
import { CaseApiClient, type CfDocumentSummary } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient } from '@/infrastructure/caseApi/http'
import { ADOPTION_STATUS_OPTIONS } from '@/domain/framework/model/adoptionStatus'

/** Compute initials from a display name */
function initials(name?: string) {
  if (!name) return '👤'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const chars = parts.map((p) => p[0]?.toUpperCase()).filter(Boolean)
  return chars.length ? chars.join('') : '👤'
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/shared/components/ui/dialog'

/** Minimal user avatar dropdown for the hero */
function UserAvatarMenu({ userName, tenantId, isAuthenticated, onSignOut }: Readonly<{ userName?: string; tenantId?: string; isAuthenticated: boolean; onSignOut?: () => void }>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const avatarText = useMemo(() => initials(userName), [userName])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    globalThis.addEventListener('pointerdown', onPointerDown)
    return () => globalThis.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div className="absolute right-5 top-4 z-10" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={userName ?? 'Account'}
        className="grid h-9 w-9 cursor-pointer select-none place-items-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        {avatarText}
      </button>

      {open ? (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="p-1">
            {userName ? (
              <div className="px-2 py-2 text-sm text-gray-400">Signed in as {userName}</div>
            ) : (
              <div className="px-2 py-2 text-sm text-gray-400">Not signed in</div>
            )}
            {tenantId ? (
              <div className="px-2 py-1.5 text-xs text-gray-400">Tenant: {tenantId}</div>
            ) : null}
            <div className="my-1 h-px bg-gray-100" />
            {isAuthenticated && onSignOut ? (
              <button
                role="menuitem"
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#2E2F2F] hover:bg-gray-50"
                onClick={() => { onSignOut(); setOpen(false) }}
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4 text-gray-500" aria-hidden />
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function HomeScreen({
  unsavedDrafts,
  onOpenFramework,
  onOpenRemoteFramework,
  onDeleteDraft,
  onRemoveFromStorage,
  remoteOpenLoading,
  onCreateNew,
}: Readonly<{
  /** Locally-created frameworks that have not yet been saved to the server */
  unsavedDrafts: HomeFramework[]
  onOpenFramework: (_id: string) => void
  onOpenRemoteFramework?: (_docId: string) => Promise<void>
  onDeleteDraft?: (_id: string) => void
  /** Remove a framework from localStorage after archive or hard delete */
  onRemoveFromStorage?: (_docId: string) => void
  remoteOpenLoading?: boolean
  onCreateNew: (_draft: CreateFrameworkDraft) => void
}>) {
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const { status, tenantId, userName, signOut, getAccessToken } = useAuth()
  const cfg = getAppConfig()

  const api = useMemo(() => new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl, { getAccessToken })), [cfg.opencaseBaseUrl, getAccessToken])

  // Server frameworks state
  const [serverFrameworks, setServerFrameworks] = useState<CfDocumentSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Active / Archived tab
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active')

  // Archived frameworks (loaded when switching to Archived tab)
  const [archivedFrameworks, setArchivedFrameworks] = useState<CfDocumentSummary[]>([])
  const [archivedLoading, setArchivedLoading] = useState(false)

  // Archive confirmation state (for active server frameworks → soft delete)
  const [archiveConfirm, setArchiveConfirm] = useState<{ docId: string; title: string } | null>(null)
  const [archivingDocId, setArchivingDocId] = useState<string | null>(null)

  // Hard delete confirmation state (for archived frameworks → permanent delete)
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState<{ docId: string; title: string } | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  // Delete confirmation state (for unsaved drafts)
  const [draftDeleteConfirm, setDraftDeleteConfirm] = useState<{ id: string; title: string } | null>(null)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

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

  // Load archived frameworks from server
  const loadArchivedFrameworks = useCallback(async () => {
    setArchivedLoading(true)
    setError(null)
    try {
      const docs = await api.listCfDocuments({ caseVersion: 'v1p1', includeArchived: true })
      // Filter to only archived (Retired/Deprecated) frameworks
      const archived = docs.filter((d) => d.adoptionStatus === 'Retired' || d.adoptionStatus === 'Deprecated')
      setArchivedFrameworks(archived)
    } catch (e: unknown) {
      setArchivedFrameworks([])
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setArchivedLoading(false)
    }
  }, [api])

  // Handle server framework archive (soft delete)
  const handleArchiveRequest = useCallback((docId: string, title: string) => {
    setArchiveConfirm({ docId, title })
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveConfirm || !tenantId) return

    setArchivingDocId(archiveConfirm.docId)
    setArchiveConfirm(null)
    setError(null)

    try {
      await api.deleteCfPackage({
        tenantId,
        docId: archiveConfirm.docId,
        caseVersion: 'v1p1',
      })

      // Remove from active list
      setServerFrameworks((prev) => prev.filter((f) => f.identifier !== archiveConfirm.docId))
      // Remove from localStorage
      onRemoveFromStorage?.(archiveConfirm.docId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setArchivingDocId(null)
    }
  }, [api, archiveConfirm, tenantId, onRemoveFromStorage])

  // Handle archived framework hard delete (permanent)
  const handleHardDeleteRequest = useCallback((docId: string, title: string) => {
    setHardDeleteConfirm({ docId, title })
  }, [])

  const handleHardDeleteConfirm = useCallback(async () => {
    if (!hardDeleteConfirm || !tenantId) return

    setDeletingDocId(hardDeleteConfirm.docId)
    setHardDeleteConfirm(null)
    setError(null)

    try {
      await api.deleteCfPackage({
        tenantId,
        docId: hardDeleteConfirm.docId,
        caseVersion: 'v1p1',
        hardDelete: true,
      })

      // Remove from archived list
      setArchivedFrameworks((prev) => prev.filter((f) => f.identifier !== hardDeleteConfirm.docId))
      // Remove from localStorage
      onRemoveFromStorage?.(hardDeleteConfirm.docId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeletingDocId(null)
    }
  }, [api, hardDeleteConfirm, tenantId, onRemoveFromStorage])

  // Handle unsaved draft delete
  const handleDraftDeleteConfirm = useCallback(() => {
    if (!draftDeleteConfirm || !onDeleteDraft) return
    onDeleteDraft(draftDeleteConfirm.id)
    setDraftDeleteConfirm(null)
  }, [draftDeleteConfirm, onDeleteDraft])

  // Handle import from external CASE endpoint
  const handleImport = useCallback(async (endpointUrl: string, accessToken?: string) => {
    if (!tenantId) throw new Error('Not authenticated')
    const result = await api.importCfPackage({
      tenantId,
      endpointUrl,
      accessToken,
    })
    // Refresh the framework list
    void loadFrameworks()
    // Open the imported framework in the editor
    if (result.id && onOpenRemoteFramework) {
      void onOpenRemoteFramework(result.id)
    }
    setImportOpen(false)
    return result
  }, [api, tenantId, loadFrameworks, onOpenRemoteFramework])

  const isAuthenticated = status === 'authenticated'

  // IDs of server frameworks, used to exclude drafts that have since been saved
  const serverIds = useMemo(() => new Set(serverFrameworks.map((f) => f.identifier)), [serverFrameworks])

  // Unsaved drafts that haven't been saved to the server yet
  const visibleDrafts = useMemo(
    () => unsavedDrafts.filter((d) => !serverIds.has(d.id)),
    [unsavedDrafts, serverIds],
  )

  // ── Search & filter helpers ────────────────────────────────────────

  function matchesSearch(title?: string, creator?: string, description?: string): boolean {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (title?.toLowerCase().includes(q) ?? false) ||
      (creator?.toLowerCase().includes(q) ?? false) ||
      (description?.toLowerCase().includes(q) ?? false)
    )
  }

  function matchesFilters(adoptionStatus?: string, frameworkType?: string): boolean {
    if (statusFilter && adoptionStatus !== statusFilter) return false
    if (typeFilter && frameworkType !== typeFilter) return false
    return true
  }

  // Filtered unsaved drafts
  const filteredDrafts = useMemo(
    () =>
      visibleDrafts.filter((d) => {
        const doc = d.cfDocument
        return matchesSearch(doc.title, doc.creator, doc.description) && matchesFilters(doc.adoptionStatus, doc.frameworkType)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleDrafts, searchQuery, statusFilter, typeFilter],
  )

  // Filtered server frameworks
  const filteredServerFrameworks = useMemo(
    () =>
      serverFrameworks.filter((doc) => {
        return matchesSearch(doc.title, doc.creator, doc.description) && matchesFilters(doc.adoptionStatus, doc.frameworkType)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serverFrameworks, searchQuery, statusFilter, typeFilter],
  )

  // Collect unique framework types for the type filter dropdown
  const allFrameworkTypes = useMemo(() => {
    const types = new Set<string>()
    visibleDrafts.forEach((d) => { if (d.cfDocument.frameworkType) types.add(d.cfDocument.frameworkType) })
    serverFrameworks.forEach((d) => { if (d.frameworkType) types.add(d.frameworkType) })
    return Array.from(types).sort((a, b) => a.localeCompare(b))
  }, [visibleDrafts, serverFrameworks])

  const hasActiveFilters = Boolean(searchQuery || statusFilter || typeFilter)
  const totalResults = filteredDrafts.length + filteredServerFrameworks.length

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('')
    setTypeFilter('')
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f5f5f6]">

      {/* ── Hero Section ── Navy → Plum gradient ─────────────────── */}
      <div className="relative bg-linear-to-r from-[#000072] to-[#662F90]">
        {/* User button — top right */}
        <UserAvatarMenu userName={userName ?? undefined} tenantId={tenantId ?? undefined} isAuthenticated={isAuthenticated} onSignOut={isAuthenticated ? () => void signOut() : undefined} />

        <div className="mx-auto max-w-6xl px-5 pb-10 pt-14">
          <h1 className="font-heading text-[48px] font-bold uppercase tracking-[0.06em] text-white sm:text-[56px]">
            OpenCASE
          </h1>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Create, manage, and publish your competency and standards frameworks
            — all in one place.
          </p>
        </div>
      </div>

      {/* ── Main content area ──────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">

        {/* ── Action bar (Refresh + Create) ───────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-normal tracking-[0.02em] text-[#2E2F2F]">Your Frameworks</h2>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                disabled={loading || archivedLoading}
                onClick={() => {
                  if (viewMode === 'archived') void loadArchivedFrameworks()
                  else void loadFrameworks()
                }}
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading || archivedLoading ? 'animate-spin' : ''}`} />
                {loading || archivedLoading ? 'Loading\u2026' : 'Refresh'}
              </Button>
            )}
            {isAuthenticated && viewMode === 'active' && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <CloudArrowDownIcon className="h-4 w-4" aria-hidden />
                Import framework
              </Button>
            )}
            {viewMode === 'active' && (
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon className="h-4 w-4" aria-hidden />
                Create framework
              </Button>
            )}
          </div>
        </div>

        {/* ── Active / Archived tabs ─────────────────────────────── */}
        {isAuthenticated && (
          <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('active')}
              className={[
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                viewMode === 'active'
                  ? 'bg-white text-[#2E2F2F] shadow-sm'
                  : 'text-gray-500 hover:text-[#2E2F2F]',
              ].join(' ')}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('archived')
                void loadArchivedFrameworks()
              }}
              className={[
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                viewMode === 'archived'
                  ? 'bg-white text-[#2E2F2F] shadow-sm'
                  : 'text-gray-500 hover:text-[#2E2F2F]',
              ].join(' ')}
            >
              Archived
            </button>
          </div>
        )}

        {/* ── Search & filter bar (active tab only) ──────────────────── */}
        {viewMode === 'active' && <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, creator, or description\u2026"
              className="w-full rounded-md border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#2E2F2F] shadow-sm placeholder:text-gray-400 focus:border-[#662F90] focus:outline-none focus:ring-2 focus:ring-[#662F90]/20"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-md border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-sm text-[#2E2F2F] shadow-sm focus:border-[#662F90] focus:outline-none focus:ring-2 focus:ring-[#662F90]/20"
            >
              <option value="">All statuses</option>
              {ADOPTION_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FunnelIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Framework type filter */}
          {allFrameworkTypes.length > 0 && (
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none rounded-md border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-sm text-[#2E2F2F] shadow-sm focus:border-[#662F90] focus:outline-none focus:ring-2 focus:ring-[#662F90]/20"
              >
                <option value="">All types</option>
                {allFrameworkTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <FunnelIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XMarkIcon className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>}

        {/* Active filter summary */}
        {viewMode === 'active' && hasActiveFilters && (
          <div className="mt-3 text-sm text-gray-400">
            Showing {totalResults} {totalResults === 1 ? 'framework' : 'frameworks'}
            {searchQuery ? <> matching &ldquo;{searchQuery}&rdquo;</> : null}
          </div>
        )}

        {/* ── Unsaved Drafts (only shown on Active tab) ──────────────── */}
        {viewMode === 'active' && filteredDrafts.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-3">
              <h3 className="font-heading text-lg font-medium tracking-[0.02em] text-[#2E2F2F]">Unsaved Drafts</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {filteredDrafts.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              New frameworks not yet saved to the server. Open to edit, then save to publish.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDrafts.map((fw) => (
                <FrameworkCard
                  key={fw.id}
                  cfDocument={fw.cfDocument}
                  rightHint="Open to edit"
                  isUnsaved
                  lastChanged={fw.cfDocument.lastChangeDateTime}
                  onClick={() => onOpenFramework(fw.id)}
                  onDelete={
                    onDeleteDraft
                      ? () => setDraftDeleteConfirm({ id: fw.id, title: fw.cfDocument.title ?? 'Untitled' })
                      : undefined
                  }
                  actionStyle="delete"
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Server Frameworks ──────────────────────────────────────── */}
        <div className="mt-6">

          {!isAuthenticated && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#2E2F2F]">
              Sign in to view frameworks from OpenCASE.
            </div>
          )}

          {isAuthenticated && error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* ── Active frameworks view ──────────────────────────────── */}
          {viewMode === 'active' && (
            <>
              {isAuthenticated && loading && !hasLoadedOnce && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Loading frameworks\u2026
                </div>
              )}

              {isAuthenticated && !loading && hasLoadedOnce && serverFrameworks.length === 0 && !error && (
                <div className="mt-4 rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-400">
                  No frameworks found. Create a new framework to get started.
                </div>
              )}

              {/* No results after filtering */}
              {isAuthenticated && hasLoadedOnce && serverFrameworks.length > 0 && filteredServerFrameworks.length === 0 && hasActiveFilters && (
                <div className="mt-4 rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-400">
                  No frameworks match your current filters.{' '}
                  <button type="button" onClick={clearFilters} className="font-medium text-[#662F90] underline underline-offset-2 hover:text-[#2E2F2F]">
                    Clear filters
                  </button>
                </div>
              )}

              {isAuthenticated && filteredServerFrameworks.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredServerFrameworks.map((doc) => {
                    const title = doc.title ?? doc.identifier ?? 'Untitled Framework'
                    const hint = remoteOpenLoading ? 'Loading\u2026' : 'Open'
                    const isArchiving = archivingDocId === doc.identifier
                    const cardClass = remoteOpenLoading || isArchiving ? 'opacity-60 pointer-events-none' : undefined
                    return (
                      <FrameworkCard
                        key={doc.identifier}
                        cfDocument={{
                          title,
                          creator: doc.creator && doc.creator !== 'Unknown' ? doc.creator : undefined,
                          description: doc.description,
                          frameworkType: doc.frameworkType,
                          adoptionStatus: doc.adoptionStatus,
                        }}
                        sourcePackageURI={doc.sourcePackageURI}
                        isModifiedFromSource={doc.isModifiedFromSource}
                        rightHint={isArchiving ? 'Archiving\u2026' : hint}
                        lastChanged={doc.lastChangeDateTime}
                        onClick={() => openRemote(doc.identifier)}
                        onDelete={tenantId ? () => handleArchiveRequest(doc.identifier, title) : undefined}
                        deleteDisabled={isArchiving || remoteOpenLoading}
                        actionStyle="archive"
                        className={cardClass}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Archived frameworks view ────────────────────────────── */}
          {viewMode === 'archived' && (
            <>
              {isAuthenticated && archivedLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Loading archived frameworks\u2026
                </div>
              )}

              {isAuthenticated && !archivedLoading && archivedFrameworks.length === 0 && !error && (
                <div className="mt-4 rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-400">
                  No archived frameworks found.
                </div>
              )}

              {isAuthenticated && archivedFrameworks.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedFrameworks.map((doc) => {
                    const title = doc.title ?? doc.identifier ?? 'Untitled Framework'
                    const isDeleting = deletingDocId === doc.identifier
                    const cardClass = isDeleting ? 'opacity-60 pointer-events-none' : undefined
                    return (
                      <FrameworkCard
                        key={doc.identifier}
                        cfDocument={{
                          title,
                          creator: doc.creator && doc.creator !== 'Unknown' ? doc.creator : undefined,
                          description: doc.description,
                          frameworkType: doc.frameworkType,
                          adoptionStatus: doc.adoptionStatus,
                        }}
                        sourcePackageURI={doc.sourcePackageURI}
                        isModifiedFromSource={doc.isModifiedFromSource}
                        rightHint={isDeleting ? 'Deleting\u2026' : undefined}
                        lastChanged={doc.lastChangeDateTime}
                        onDelete={tenantId ? () => handleHardDeleteRequest(doc.identifier, title) : undefined}
                        deleteDisabled={isDeleting}
                        actionStyle="delete"
                        className={cardClass}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <a href="https://www.1edtech.org" target="_blank" rel="noopener noreferrer">
                <img src="/logo.png" alt="1EdTech" className="h-7 w-auto" />
              </a>
              <div className="text-sm text-gray-500">
                Built on the{' '}
                <a
                  href="https://www.1edtech.org/standards/case"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#662F90] underline underline-offset-2 hover:text-[#2E2F2F]"
                >
                  CASE standard
                </a>
                {' '}from{' '}
                <a
                  href="https://www.1edtech.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#662F90] underline underline-offset-2 hover:text-[#2E2F2F]"
                >
                  1EdTech
                </a>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} 1EdTech Consortium, Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <CreateFrameworkDialog
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreate={(draft) => {
          setCreateOpen(false)
          onCreateNew(draft)
        }}
      />

      <ImportFrameworkDialog
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onImport={handleImport}
      />

      {/* Archive Confirmation Dialog (active server frameworks → soft delete) */}
      <Dialog open={Boolean(archiveConfirm)} onOpenChange={(open) => !open && setArchiveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Framework</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive &ldquo;{archiveConfirm?.title}&rdquo;?
              The framework will be archived on the server and can be restored by an administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setArchiveConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleArchiveConfirm()}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Confirmation Dialog (archived frameworks → permanent delete) */}
      <Dialog open={Boolean(hardDeleteConfirm)} onOpenChange={(open) => !open && setHardDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete Framework</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &ldquo;{hardDeleteConfirm?.title}&rdquo;?
              This action cannot be undone. The framework and all its data will be removed from the server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setHardDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleHardDeleteConfirm()}>
              Delete permanently
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
