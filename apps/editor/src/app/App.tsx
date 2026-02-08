import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorProvider } from '@/ui/editor/state/EditorContext'
import EditorCanvas from '@/ui/editor/EditorCanvas'
import HomeScreen from '@/ui/home/HomeScreen'
import { createNewFrameworkDraft, createHomeFrameworkFromDomain, loadFrameworks, saveFrameworks, type HomeFramework } from '@/ui/home/frameworkStore'
import type { CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { getAppConfig } from '@/app/config'
import { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient } from '@/infrastructure/caseApi/http'
import { loadFrameworkFromCfPackage } from '@/application/framework/services/FrameworkLoader'
import { toReactFlowGraph, extractLayoutFromCfPackage } from '@/ui/editor/reactflow/mapping'
import type { LayoutState } from '@/ui/editor/reactflow/mapping'
import type { CaseVersion } from '@/application/framework/mappers/case/CasePackageSnapshot'
import LoginScreen from '@/ui/auth/LoginScreen'

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

  // Track which framework IDs have been published to OpenCASE
  // (either loaded from the server or successfully saved)
  const [publishedFrameworkIds, setPublishedFrameworkIds] = useState<Set<string>>(new Set())

  const [authCallbackState, setAuthCallbackState] = useState<'idle' | 'processing' | 'error'>('idle')
  const [remoteOpenState, setRemoteOpenState] = useState<'idle' | 'loading'>('idle')

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
        setAuthCallbackState('error')
      })
  }, [completeSignIn])

  // Force unauthenticated users onto the login route.
  useEffect(() => {
    if (route === 'authCallback') return
    if (authStatus === 'authenticated') return
    if (globalThis.location?.hash?.startsWith('#/login')) return
    globalThis.history?.replaceState(null, '', '/#/login')
    setRoute('login')
  }, [authStatus, route])

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

  const openRemoteFramework = useCallback(
    async (docId: string) => {
      setRemoteOpenState('loading')
      try {
        // Fetch the CASE package from the API
        const pkg = await api.getCfPackage({ docId, caseVersion: 'v1p1' })

        // Extract layout from CASE extensions before converting to domain model
        const layout = extractLayoutFromCfPackage(pkg)

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
    [api],
  )

  // Derive the graph from the active framework
  // This converts the domain Framework to React Flow format
  const activeGraph = useMemo(() => {
    if (!activeFramework) return null

    // Use legacy graph if available (for backward compatibility with stored data)
    if (activeFramework.graph) {
      return activeFramework.graph
    }

    // Get the stored layout for this framework (from CASE extensions)
    const layout = frameworkLayouts[activeFramework.id]

    // Derive from the domain Framework with layout
    return toReactFlowGraph({ framework: activeFramework.framework, layout })
  }, [activeFramework, frameworkLayouts])

  // Determine CASE version from framework metadata or CFDocument
  // (computed early so useCallback has stable deps - must be before all early returns)
  const activeCaseVersion: CaseVersion = activeFramework
    ? ((activeFramework.framework.metadata.caseVersion 
        ?? activeFramework.cfDocument.caseVersion 
        ?? '1.1') as CaseVersion)
    : '1.1'
  
  // Determine CASE API version for requests
  const caseApiVersion: 'v1p0' | 'v1p1' = activeCaseVersion === '1.0' ? 'v1p0' : 'v1p1'

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
    [api, tenantId, caseApiVersion],
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
      remoteOpenLoading={remoteOpenState === 'loading'}
      onCreateNew={createNew}
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
      skipAutoLayout={Boolean(frameworkLayouts[activeFramework.id])}
    >
      <EditorCanvas
        onBack={() => {
          setScreen('home')
        }}
        onSaveToServer={tenantId ? handleSaveToServer : undefined}
        isPublishedToOpenCase={activeFrameworkId ? publishedFrameworkIds.has(activeFrameworkId) : false}
      />
    </EditorProvider>
  )
}
