import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorProvider } from '@/ui/editor/state/EditorContext'
import EditorCanvas from '@/ui/editor/EditorCanvas'
import HomeScreen from '@/ui/home/HomeScreen'
import { createNewFrameworkDraft, createHomeFrameworkFromDomain, loadFrameworks, saveFrameworks, type HomeFramework } from '@/ui/home/frameworkStore'
import type { CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'
import type { Framework } from '@/domain/framework/model/types'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { getAppConfig } from '@/app/config'
import { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
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

  const activeFramework = useMemo(() => {
    if (!activeFrameworkId) return null
    return frameworks.find((f) => f.id === activeFrameworkId) ?? null
  }, [frameworks, activeFrameworkId])

  // Unsaved drafts: frameworks in the local cache that haven't been published to the server
  const unsavedDrafts = useMemo(
    () => frameworks.filter((f) => !publishedFrameworkIds.has(f.id)),
    [frameworks, publishedFrameworkIds],
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

        // Create a HomeFramework entry from the domain Framework
        const fw = createHomeFrameworkFromDomain(framework)

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
      
      await api.saveCfPackage({
        tenantId,
        cfPackage: openCasePackage,
        caseVersion: caseApiVersion,
      })
      
      // Mark this framework as published to OpenCASE
      if (activeFrameworkId) {
        setPublishedFrameworkIds((prev) => new Set(prev).add(activeFrameworkId))
      }
      
      console.log('[App] Saved successfully')
    },
    [api, tenantId, caseApiVersion, activeFrameworkId],
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
      />
    </EditorProvider>
  )
}
