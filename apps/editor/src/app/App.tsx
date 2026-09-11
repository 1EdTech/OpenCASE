import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorProvider } from '@/ui/editor/state/EditorContext'
import EditorCanvas from '@/ui/editor/EditorCanvas'
import HomeScreen from '@/ui/home/HomeScreen'
import { createNewFrameworkDraft, createHomeFrameworkFromDomain, loadFrameworks, saveFrameworks, type HomeFramework } from '@/ui/home/frameworkStore'
import type { CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'
import type { Framework } from '@/domain/framework/model/types'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { getAppConfig } from '@/app/config'
import { CaseApiClient, type CfDocumentSummary } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient } from '@/infrastructure/caseApi/http'
import { loadFrameworkFromCfPackage } from '@/application/framework/services/FrameworkLoader'
import { toReactFlowGraph, extractLayoutFromCfPackage, extractEditorSettingsFromCfPackage } from '@/ui/editor/reactflow/mapping'
import type { LayoutState } from '@/ui/editor/reactflow/mapping'
import type { CaseVersion } from '@/application/framework/mappers/case/CasePackageSnapshot'
import type { CFAssociationGrouping, CFItemType, CFLicense, CFSubject, CFConcept } from '@/domain/case/types'
import LoginScreen from '@/ui/auth/LoginScreen'
import { detectTopology } from '@/ui/editor/layout/detectTopology'
import { applyInitialLayout } from '@/ui/editor/layout/applyInitialLayout'

/** Extract CFDefinitions from a raw CFPackage response and merge into tenant state */
function extractCfDefinitions(pkg: unknown): {
  CFItemTypes?: CFItemType[]
  CFSubjects?: CFSubject[]
  CFConcepts?: CFConcept[]
  CFLicenses?: CFLicense[]
  CFAssociationGroupings?: CFAssociationGrouping[]
} {
  const p = pkg as Record<string, unknown> | null
  if (!p) return {}
  // Handle both wrapped { CFPackage: { ... } } and unwrapped formats
  const inner = (p.CFPackage ?? p) as Record<string, unknown>
  const defs = inner.CFDefinitions as Record<string, unknown[]> | undefined
  if (!defs) return {}
  return {
    CFItemTypes: Array.isArray(defs.CFItemTypes) ? (defs.CFItemTypes as CFItemType[]) : undefined,
    CFSubjects: Array.isArray(defs.CFSubjects) ? (defs.CFSubjects as CFSubject[]) : undefined,
    CFConcepts: Array.isArray(defs.CFConcepts) ? (defs.CFConcepts as CFConcept[]) : undefined,
    CFLicenses: Array.isArray(defs.CFLicenses) ? (defs.CFLicenses as CFLicense[]) : undefined,
    CFAssociationGroupings: Array.isArray(defs.CFAssociationGroupings) ? (defs.CFAssociationGroupings as CFAssociationGrouping[]) : undefined,
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

function AppInner() {
  const { completeSignIn, getAccessToken, status: authStatus, tenantId } = useAuth()
  const cfg = getAppConfig()
  const api = useMemo(() => new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl, { getAccessToken })), [cfg.opencaseBaseUrl, getAccessToken])

  const [screen, setScreen] = useState<'home' | 'editor'>('home')
  const [frameworks, setFrameworks] = useState<HomeFramework[]>(() => loadFrameworks())
  const [activeFrameworkId, setActiveFrameworkId] = useState<string | null>(null)
  
  // Store layouts extracted from CASE extensions (keyed by framework ID)
  const [frameworkLayouts, setFrameworkLayouts] = useState<Record<string, LayoutState>>({})

  // Store per-framework edge type from CASE extensions (keyed by framework ID)
  const [frameworkEdgeTypes, setFrameworkEdgeTypes] = useState<Record<string, string>>({})

  // Tenant-wide definitions catalogue (loaded from management endpoint)
  const [tenantCfItemTypes, setTenantCfItemTypes] = useState<CFItemType[]>([])
  const [tenantCfSubjects, setTenantCfSubjects] = useState<CFSubject[]>([])
  const [tenantCfConcepts, setTenantCfConcepts] = useState<CFConcept[]>([])
  const [tenantCfLicenses, setTenantCfLicenses] = useState<CFLicense[]>([])
  const [tenantCfAssociationGroupings, setTenantCfAssociationGroupings] = useState<CFAssociationGrouping[]>([])

  // Track which framework IDs have been published to OpenCASE
  // (either loaded from the server or successfully saved)
  const [publishedFrameworkIds, setPublishedFrameworkIds] = useState<Set<string>>(new Set())

  // Server-side framework list — populated from GET /ims/case/v1p1/CFDocuments on auth
  const [serverCfDocuments, setServerCfDocuments] = useState<CfDocumentSummary[]>([])

  /** Merge CFDefinitions from a loaded CFPackage into the tenant state (additive, no overwrites) */
  const mergeCfDefinitions = useCallback((pkg: unknown) => {
    const defs = extractCfDefinitions(pkg)
    if (defs.CFItemTypes?.length) {
      setTenantCfItemTypes((prev) => {
        const ids = new Set(prev.map((d) => d.identifier))
        const newOnes = defs.CFItemTypes!.filter((d) => !ids.has(d.identifier))
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev
      })
    }
    if (defs.CFSubjects?.length) {
      setTenantCfSubjects((prev) => {
        const ids = new Set(prev.map((d) => d.identifier))
        const newOnes = defs.CFSubjects!.filter((d) => !ids.has(d.identifier))
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev
      })
    }
    if (defs.CFConcepts?.length) {
      setTenantCfConcepts((prev) => {
        const ids = new Set(prev.map((d) => d.identifier))
        const newOnes = defs.CFConcepts!.filter((d) => !ids.has(d.identifier))
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev
      })
    }
    if (defs.CFLicenses?.length) {
      setTenantCfLicenses((prev) => {
        const ids = new Set(prev.map((d) => d.identifier))
        const newOnes = defs.CFLicenses!.filter((d) => !ids.has(d.identifier))
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev
      })
    }
    if (defs.CFAssociationGroupings?.length) {
      setTenantCfAssociationGroupings((prev) => {
        const ids = new Set(prev.map((d) => d.identifier))
        const newOnes = defs.CFAssociationGroupings!.filter((d) => !ids.has(d.identifier))
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev
      })
    }
  }, [])

  const [authCallbackState, setAuthCallbackState] = useState<'idle' | 'processing' | 'error'>('idle')
  const [remoteOpenState, setRemoteOpenState] = useState<'idle' | 'loading'>('idle')
  const authStatusRef = useRef(authStatus)
  authStatusRef.current = authStatus

  const getRoute = useCallback((): 'authCallback' | 'login' | 'app' => {
    const hash = globalThis.location?.hash ?? ''
    if (hash.startsWith('#/auth/callback')) return 'authCallback'
    if (hash.startsWith('#/login')) return 'login'
    return 'app'
  }, [])
  const [route, setRoute] = useState<'authCallback' | 'login' | 'app'>(() => getRoute())

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    globalThis.addEventListener('hashchange', onHashChange)
    return () => globalThis.removeEventListener('hashchange', onHashChange)
  }, [getRoute])

  useEffect(() => {
    const hash = globalThis.location?.hash ?? ''
    if (!hash.startsWith('#/auth/callback')) return
    // Capture the full URL (includes one-time code), then immediately strip it from the address bar.
    // This avoids accidental double-redemption (e.g. React StrictMode remount in dev).
    const href = globalThis.location?.href ?? ''
    globalThis.history?.replaceState(null, '', '/#/auth/callback')
    setRoute('authCallback')

    setAuthCallbackState('processing')
    completeSignIn(href)
      .then(() => {
        // Clear callback hash (and any query params) from the URL.
        globalThis.history?.replaceState(null, '', '/#/')
        setAuthCallbackState('idle')
        setRoute(getRoute())
      })
      .catch(() => {
        // In React StrictMode, a duplicate callback attempt can fail after a successful sign-in.
        // Wait briefly for auth state to propagate before declaring failure.
        setTimeout(() => {
          if (authStatusRef.current === 'authenticated') {
            globalThis.history?.replaceState(null, '', '/#/')
            setAuthCallbackState('idle')
            setRoute(getRoute())
          } else {
            setAuthCallbackState('error')
          }
        }, 500)
      })
  }, [completeSignIn, getRoute])

  // Force unauthenticated users onto the login route.
  useEffect(() => {
    if (route === 'authCallback') return
    if (authStatus === 'authenticated') return
    if (globalThis.location?.hash?.startsWith('#/login')) return
    globalThis.history?.replaceState(null, '', '/#/login')
    setRoute('login')
  }, [authStatus, route])

  // Fetch the full definitions catalogue from the management endpoint once authenticated.
  useEffect(() => {
    if (authStatus !== 'authenticated' || !tenantId) return
    let cancelled = false
    console.log('[App] Fetching definitions catalogue for tenant:', tenantId)
    api.listDefinitions({ tenantId }).then((defs) => {
      if (cancelled) return
      console.log('[App] Definitions loaded:', {
        CFItemTypes: defs.CFItemTypes?.length ?? 0,
        CFSubjects: defs.CFSubjects?.length ?? 0,
        CFConcepts: defs.CFConcepts?.length ?? 0,
        CFLicenses: defs.CFLicenses?.length ?? 0,
        CFAssociationGroupings: defs.CFAssociationGroupings?.length ?? 0,
      })
      if (defs.CFItemTypes && defs.CFItemTypes.length > 0) {
        setTenantCfItemTypes(defs.CFItemTypes)
      }
      if (defs.CFSubjects && defs.CFSubjects.length > 0) {
        setTenantCfSubjects(defs.CFSubjects)
      }
      if (defs.CFConcepts && defs.CFConcepts.length > 0) {
        setTenantCfConcepts(defs.CFConcepts)
      }
      if (defs.CFLicenses && defs.CFLicenses.length > 0) {
        setTenantCfLicenses(defs.CFLicenses)
      }
      if (defs.CFAssociationGroupings && defs.CFAssociationGroupings.length > 0) {
        setTenantCfAssociationGroupings(defs.CFAssociationGroupings)
      }
    }).catch((err) => {
      console.warn('[App] Failed to load definitions catalogue:', err)
    })
    return () => { cancelled = true }
  }, [authStatus, tenantId, api])

  // Fetch server framework list so tree-view crosswalk selector can show all tenant frameworks.
  useEffect(() => {
    if (authStatus !== 'authenticated') return
    let cancelled = false
    api.listCfDocuments({ caseVersion: 'v1p1' }).then((docs) => {
      if (cancelled) return
      setServerCfDocuments(docs)
    }).catch((err) => {
      console.warn('[App] Failed to load server framework list:', err)
    })
    return () => { cancelled = true }
  }, [authStatus, api])

  const activeFramework = useMemo(() => {
    if (!activeFrameworkId) return null
    return frameworks.find((f) => f.id === activeFrameworkId) ?? null
  }, [frameworks, activeFrameworkId])

  // Unsaved drafts: frameworks in the local cache that haven't been published to the server
  const unsavedDrafts = useMemo(
    () => frameworks.filter((f) => !publishedFrameworkIds.has(f.id)),
    [frameworks, publishedFrameworkIds],
  )

  // Summaries of server frameworks passed to the crosswalk target selector (excludes alignment frameworks)
  const serverFrameworkSummaries = useMemo(
    () => serverCfDocuments
      .filter((d) => d.frameworkType !== 'Alignment')
      .map((d) => ({ id: d.identifier, title: d.title ?? d.identifier })),
    [serverCfDocuments],
  )

  const openFramework = useCallback((id: string) => {
    setActiveFrameworkId(id)
    setScreen('editor')
  }, [])

  const deleteDraft = useCallback((id: string) => {
    setFrameworks((prev) => {
      const next = prev.filter((f) => f.id !== id)
      saveFrameworks(next)
      return next
    })
    // If we're deleting the active framework, go back to home
    if (activeFrameworkId === id) {
      setActiveFrameworkId(null)
      setScreen('home')
    }
  }, [activeFrameworkId])

  /** Remove a framework from localStorage (used after archive or hard delete) */
  const removeFrameworkFromStorage = useCallback((docId: string) => {
    setFrameworks((prev) => {
      const next = prev.filter((f) => f.id !== docId)
      saveFrameworks(next)
      return next
    })
    setPublishedFrameworkIds((prev) => {
      const next = new Set(prev)
      next.delete(docId)
      return next
    })
    if (activeFrameworkId === docId) {
      setActiveFrameworkId(null)
      setScreen('home')
    }
  }, [activeFrameworkId])

  const createNew = useCallback((draft: CreateFrameworkDraft) => {
    const fw = createNewFrameworkDraft(draft)
    setFrameworks((prev) => {
      const next = [fw, ...prev]
      saveFrameworks(next)
      return next
    })
    setActiveFrameworkId(fw.id)
    setScreen('editor')
  }, [])

  /** Create a HomeFramework from a pre-populated domain Framework (e.g. from spreadsheet upload). */
  const createFromFramework = useCallback((framework: Framework) => {
    const fw = createHomeFrameworkFromDomain(framework)
    setFrameworks((prev) => {
      const next = [fw, ...prev]
      saveFrameworks(next)
      return next
    })
    setActiveFrameworkId(fw.id)
    setScreen('editor')
  }, [])

  const openRemoteFramework = useCallback(
    async (docId: string) => {
      setRemoteOpenState('loading')
      try {
        // Fetch the CASE package from the API
        const pkg = await api.getCfPackage({ docId, caseVersion: 'v1p1' })

        // Extract CFDefinitions (item types, subjects, concepts, groupings) from the package
        mergeCfDefinitions(pkg)

        // Extract layout and editor settings from CASE extensions before converting to domain model
        const layout = extractLayoutFromCfPackage(pkg)
        const editorSettings = extractEditorSettingsFromCfPackage(pkg)

        // Use the FrameworkLoader to map CASE → domain Framework
        // This handles v1p0/v1p1 differences through the normalization layer
        const framework = loadFrameworkFromCfPackage(pkg)
        if (!framework) {
          throw new Error('Failed to load framework from CASE package')
        }

        // Extract mirror/fork status from the CFDocument's ext:opencase
        // extension (always present in this response — the editor's HTTP
        // client sends X-CASE-EDITOR, which asks the backend to include it).
        const opencaseExt = (pkg.CFDocument?.extensions as Record<string, unknown> | undefined)?.['ext:opencase'] as
          | { isModifiedFromSource?: boolean; sourcePackageURI?: string }
          | undefined
        const mirrorStatus = opencaseExt?.isModifiedFromSource !== undefined
          ? { isModifiedFromSource: opencaseExt.isModifiedFromSource, sourcePackageURI: opencaseExt.sourcePackageURI }
          : undefined

        // Create a HomeFramework entry from the domain Framework
        const fw = createHomeFrameworkFromDomain(framework, mirrorStatus)

        // Store the extracted layout
        if (layout) {
          setFrameworkLayouts((prev) => ({ ...prev, [fw.id]: layout }))
        }

        // Store the extracted edge type
        if (editorSettings?.edgeType) {
          setFrameworkEdgeTypes((prev) => ({ ...prev, [fw.id]: editorSettings.edgeType! }))
        }

        setFrameworks((prev) => {
          // Update existing framework or add new one
          const existingIdx = prev.findIndex((f) => f.id === fw.id)
          let next: HomeFramework[]
          if (existingIdx >= 0) {
            // Replace existing with fresh server data
            next = [...prev]
            next[existingIdx] = fw
          } else {
            next = [fw, ...prev]
          }
          // Persist so a refresh doesn't lose the loaded backend framework.
          saveFrameworks(next)
          return next
        })

        // Mark as published since it was loaded from OpenCASE
        setPublishedFrameworkIds((prev) => new Set(prev).add(fw.id))

        setActiveFrameworkId(fw.id)
        setScreen('editor')
      } finally {
        setRemoteOpenState('idle')
      }
    },
    [api, mergeCfDefinitions],
  )

  // Load a framework from the server into the local session without navigating to it.
  // Used by TreePanelView when the user selects a crosswalk target that isn't loaded locally yet.
  const handleLoadTargetFramework = useCallback(
    async (docId: string) => {
      const pkg = await api.getCfPackage({ docId, caseVersion: 'v1p1' })
      mergeCfDefinitions(pkg)
      const layout = extractLayoutFromCfPackage(pkg)
      const editorSettings = extractEditorSettingsFromCfPackage(pkg)
      const framework = loadFrameworkFromCfPackage(pkg)
      if (!framework) throw new Error('Failed to load framework from CASE package')
      const fw = createHomeFrameworkFromDomain(framework)
      if (layout) setFrameworkLayouts((prev) => ({ ...prev, [fw.id]: layout }))
      if (editorSettings?.edgeType) setFrameworkEdgeTypes((prev) => ({ ...prev, [fw.id]: editorSettings.edgeType! }))
      setFrameworks((prev) => {
        if (prev.some((f) => f.id === fw.id)) return prev
        const next = [...prev, fw]
        saveFrameworks(next)
        return next
      })
      setPublishedFrameworkIds((prev) => new Set(prev).add(fw.id))
    },
    [api, mergeCfDefinitions],
  )

  // Derive the graph from the active framework
  // This converts the domain Framework to React Flow format.
  // When no saved layout exists the topology is detected and an appropriate
  // auto-layout is applied *before* the first render so there is no visible jump.
  const { graph: activeGraph, autoEdgeType } = useMemo(() => {
    if (!activeFramework) return { graph: null, autoEdgeType: undefined as string | undefined }

    // Use legacy graph if available (for backward compatibility with stored data)
    if (activeFramework.graph) {
      return { graph: activeFramework.graph, autoEdgeType: undefined as string | undefined }
    }

    // Get the stored layout for this framework (from CASE extensions)
    const layout = frameworkLayouts[activeFramework.id]
    const graph = toReactFlowGraph({ framework: activeFramework.framework, layout })

    // If no saved layout, detect topology and apply appropriate layout
    if (!layout) {
      const topology = detectTopology(graph)
      const result = applyInitialLayout(graph, topology)
      return { graph: result.graph, autoEdgeType: result.edgeType }
    }

    return { graph, autoEdgeType: undefined as string | undefined }
  }, [activeFramework, frameworkLayouts])

  // Determine CASE version from framework metadata or CFDocument
  // (computed early so useCallback has stable deps - must be before all early returns)
  const activeCaseVersion: CaseVersion = activeFramework
    ? ((activeFramework.framework.metadata.caseVersion 
        ?? activeFramework.cfDocument.caseVersion 
        ?? '1.1') as CaseVersion)
    : '1.1'
  
  // Always save/archive via v1p1 management endpoints.
  // The backend serves frameworks transparently over both v1p0 and v1p1 public APIs
  // via on-the-fly downconversion, so a single v1p1 store is sufficient.
  const caseApiVersion: 'v1p0' | 'v1p1' = 'v1p1'

  // Handler to archive the active framework on the server
  // Must be defined before early returns (React hooks rules)
  const handleArchiveFramework = useCallback(async () => {
    if (!tenantId || !activeFrameworkId) {
      throw new Error('Not signed in or no active framework')
    }
    await api.deleteCfPackage({
      tenantId,
      docId: activeFrameworkId,
      caseVersion: caseApiVersion,
    })
    removeFrameworkFromStorage(activeFrameworkId)
  }, [api, tenantId, activeFrameworkId, caseApiVersion, removeFrameworkFromStorage])

  // Handler to fetch the published CFPackage from the server (returns CASE JSON with absolute URIs)
  const handleFetchCfPackage = useCallback(async () => {
    if (!activeFrameworkId) throw new Error('No active framework')
    return api.getCfPackage({ docId: activeFrameworkId, caseVersion: caseApiVersion })
  }, [api, activeFrameworkId, caseApiVersion])

  // Handler to save the CFPackage to the server
  // Must be defined before early returns (React hooks rules)
  const handleSaveToServer = useCallback(
    async (openCasePackage: unknown) => {
      if (!tenantId) {
        throw new Error('Not signed in to a tenant. Please sign in to save.')
      }

      console.log('[App] Saving to server:', { tenantId, caseApiVersion })

      const result = await api.saveCfPackage({
        tenantId,
        cfPackage: openCasePackage,
        caseVersion: caseApiVersion,
      })

      // Mark this framework as published to OpenCASE
      if (activeFrameworkId) {
        setPublishedFrameworkIds((prev) => new Set(prev).add(activeFrameworkId))
      }

      // A fork mints new identifiers server-side for the document AND every
      // item/association in it — not just the document. Patching the local
      // session by hand would mean re-deriving that whole remap ourselves and
      // risk resubmitting stale, already-freed identifiers on the next save.
      // Instead, treat this exactly like opening a freshly-saved framework:
      // re-fetch the authoritative post-fork state from the server (reusing
      // the same path a normal "open" uses), then drop the superseded
      // pre-fork local record.
      if (activeFrameworkId && result.docId && result.docId !== activeFrameworkId) {
        const oldId = activeFrameworkId
        await openRemoteFramework(result.docId)
        setFrameworks((prev) => {
          const next = prev.filter((f) => f.id !== oldId)
          saveFrameworks(next)
          return next
        })
        setPublishedFrameworkIds((prev) => {
          const next = new Set(prev)
          next.delete(oldId)
          return next
        })
        setFrameworkLayouts((prev) => {
          const { [oldId]: _dropped, ...rest } = prev
          return rest
        })
        setFrameworkEdgeTypes((prev) => {
          const { [oldId]: _dropped, ...rest } = prev
          return rest
        })
      } else if (activeFrameworkId && result.isModifiedFromSource !== undefined) {
        setFrameworks((prev) => {
          const next = prev.map((f) =>
            f.id === activeFrameworkId
              ? { ...f, mirrorStatus: { isModifiedFromSource: result.isModifiedFromSource, sourcePackageURI: result.sourcePackageURI } }
              : f
          )
          saveFrameworks(next)
          return next
        })
      }

      console.log('[App] Saved successfully')
    },
    [api, tenantId, caseApiVersion, activeFrameworkId, openRemoteFramework],
  )

  const handleSaveAlignments = useCallback(
    async (cfPackage: unknown) => {
      if (!tenantId) throw new Error('Not signed in to a tenant. Please sign in to save.')
      const pkg = cfPackage as { CFAssociations?: unknown[]; CFDocument?: { identifier?: string } }
      const docId = pkg.CFDocument?.identifier
      if (!pkg.CFAssociations?.length && docId) {
        // No associations remain — delete the alignment doc so it won't resurface on reload.
        // If the doc never existed on the server (new target, never saved) the 404 is harmless.
        try {
          await api.deleteCfPackage({ tenantId, docId, hardDelete: true })
        } catch {
          // ignore — doc may not exist on the server yet
        }
      } else {
        await api.saveCfPackage({ tenantId, cfPackage, caseVersion: caseApiVersion })
      }
    },
    [api, tenantId, caseApiVersion],
  )

  const handleDiscoverAlignedTargets = useCallback(
    async (sourceId: string): Promise<Array<{ targetId: string; alignmentDocId: string }>> => {
      if (!tenantId) return []
      try {
        const alignmentDocs = await api.listAlignmentFrameworks({ tenantId, participantId: sourceId })
        return alignmentDocs.flatMap((doc) => {
          const participants = doc.alignmentParticipants ?? []
          const other = participants.find((p) => p.identifier !== sourceId)
          // No distinct "other" participant means this is a self (intra-framework) alignment doc.
          const targetIdentifier = other?.identifier ?? (participants.some((p) => p.identifier === sourceId) ? sourceId : undefined)
          if (!targetIdentifier) return []
          return [{ targetId: targetIdentifier, alignmentDocId: doc.sourcedId }]
        })
      } catch (err) {
        console.warn('[App] Failed to discover aligned targets:', err)
        return []
      }
    },
    [api, tenantId],
  )

  const handleLoadAlignmentsForTarget = useCallback(
    async (targetId: string): Promise<{
      docId: string
      associations: Array<{ id: string; fromItemId: string; toItemId: string; toFrameworkId: string; associationType: string; originUri: string; destinationUri: string }>
    }> => {
      const newDocId = () => globalThis.crypto?.randomUUID?.() ?? `align-${Date.now()}`
      if (!tenantId || !activeFrameworkId) return { docId: newDocId(), associations: [] }
      try {
        const alignmentDocs = await api.listAlignmentFrameworks({ tenantId, participantId: activeFrameworkId })
        // Every doc here already has activeFrameworkId as a participant (that's the query filter), so
        // for a self-alignment (targetId === activeFrameworkId) matching "any participant === targetId"
        // would match the first cross-framework doc too — instead require ALL participants to be self.
        const matchingDoc = alignmentDocs.find((doc) => {
          const participants = doc.alignmentParticipants ?? []
          if (targetId === activeFrameworkId) {
            return participants.length > 0 && participants.every((p) => p.identifier === activeFrameworkId)
          }
          return participants.some((p) => p.identifier === targetId)
        })
        if (!matchingDoc) return { docId: newDocId(), associations: [] }

        const pkg = await api.getCfPackage({ docId: matchingDoc.sourcedId, caseVersion: 'v1p1' })
        const cfAssociations = pkg.CFAssociations ?? []
        const associations = cfAssociations
          .map((a) => ({
            id: a.identifier,
            fromItemId: a.originNodeURI?.identifier ?? '',
            toItemId: a.destinationNodeURI?.identifier ?? '',
            toFrameworkId: targetId,
            associationType: a.associationType ?? 'isRelatedTo',
            originUri: a.originNodeURI?.uri ?? '',
            destinationUri: a.destinationNodeURI?.uri ?? '',
          }))
          .filter((a) => a.fromItemId && a.toItemId)
        return { docId: matchingDoc.sourcedId, associations }
      } catch (err) {
        console.warn('[App] Failed to load alignment associations:', err)
        return { docId: newDocId(), associations: [] }
      }
    },
    [api, tenantId, activeFrameworkId],
  )

  if (authCallbackState === 'processing') {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        <div className="mx-auto w-full max-w-2xl px-5 py-12">
          <div className="text-lg font-semibold text-slate-900">Signing you in…</div>
          <div className="mt-2 text-sm text-slate-600">Completing login redirect.</div>
        </div>
      </div>
    )
  }

  if (authCallbackState === 'error') {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        <div className="mx-auto w-full max-w-2xl px-5 py-12">
          <div className="text-lg font-semibold text-slate-900">Sign-in failed</div>
          <div className="mt-2 text-sm text-slate-600">Please try signing in again.</div>
        </div>
      </div>
    )
  }

  if (route === 'login') {
    return <LoginScreen />
  }

  if (authStatus !== 'authenticated') {
    // During the redirect to /#/login.
    return <LoginScreen />
  }

  const homeScreen = (
    <HomeScreen
      unsavedDrafts={unsavedDrafts}
      onOpenFramework={openFramework}
      onOpenRemoteFramework={openRemoteFramework}
      onDeleteDraft={deleteDraft}
      onRemoveFromStorage={removeFrameworkFromStorage}
      remoteOpenLoading={remoteOpenState === 'loading'}
      onCreateNew={createNew}
      onUploadFramework={createFromFramework}
    />
  )

  if (screen === 'home') {
    return homeScreen
  }

  if (!activeFramework || !activeGraph) {
    return homeScreen
  }

  return (
    <EditorProvider 
      initialGraph={activeGraph} 
      graphKey={activeFramework.id} 
      caseVersion={activeCaseVersion}
      skipAutoLayout={Boolean(frameworkLayouts[activeFramework.id]) || Boolean(autoEdgeType)}
      initialEdgeType={frameworkEdgeTypes[activeFramework.id] ?? autoEdgeType}
      initialCfItemTypes={tenantCfItemTypes}
      initialCfSubjects={tenantCfSubjects}
      initialCfConcepts={tenantCfConcepts}
      initialCfLicenses={tenantCfLicenses}
      initialCfAssociationGroupings={tenantCfAssociationGroupings}
    >
      <EditorCanvas
        onBack={() => {
          setScreen('home')
        }}
        onSaveToServer={tenantId ? handleSaveToServer : undefined}
        isPublishedToOpenCase={activeFrameworkId ? publishedFrameworkIds.has(activeFrameworkId) : false}
        onArchiveFramework={tenantId && activeFrameworkId ? handleArchiveFramework : undefined}
        onFetchCfPackage={activeFrameworkId ? handleFetchCfPackage : undefined}
        availableFrameworks={frameworks}
        serverFrameworks={serverFrameworkSummaries}
        onLoadTargetFramework={handleLoadTargetFramework}
        onSaveAlignments={tenantId ? handleSaveAlignments : undefined}
        onLoadAlignmentsForTarget={tenantId ? handleLoadAlignmentsForTarget : undefined}
        onDiscoverAlignedTargets={tenantId ? handleDiscoverAlignedTargets : undefined}
        mirrorStatus={activeFramework.mirrorStatus}
      />
    </EditorProvider>
  )
}
