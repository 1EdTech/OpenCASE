import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorProvider } from '@/ui/editor/state/EditorContext'
import EditorCanvas from '@/ui/editor/EditorCanvas'
import HomeScreen from '@/ui/home/HomeScreen'
import { createNewFrameworkDraft, loadFrameworks, saveFrameworks, type HomeFramework } from '@/ui/home/frameworkStore'
import type { CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { getAppConfig } from '@/app/config'
import { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient } from '@/infrastructure/caseApi/http'
import { createGraphFromCfPackage } from '@/ui/editor/state/editorFactories'
import LoginScreen from '@/ui/auth/LoginScreen'

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

function AppInner() {
  const { completeSignIn, getAccessToken, status: authStatus } = useAuth()
  const cfg = getAppConfig()
  const api = useMemo(() => new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl, { getAccessToken })), [cfg.opencaseBaseUrl, getAccessToken])

  const [screen, setScreen] = useState<'home' | 'editor'>('home')
  const [frameworks, setFrameworks] = useState<HomeFramework[]>(() => loadFrameworks())
  const [activeFrameworkId, setActiveFrameworkId] = useState<string | null>(null)

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

  const openFramework = useCallback((id: string) => {
    setActiveFrameworkId(id)
    setScreen('editor')
  }, [])

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
        const pkg = await api.getCfPackage({ docId, caseVersion: 'v1p1' })
        const graph = createGraphFromCfPackage(pkg)
        const fw: HomeFramework = { id: pkg.CFDocument.identifier, cfDocument: pkg.CFDocument, graph }

        setFrameworks((prev) => {
          const exists = prev.some((f) => f.id === fw.id)
          const next = exists ? prev : [fw, ...prev]
          // Persist so a refresh doesn't lose the loaded backend framework.
          saveFrameworks(next)
          return next
        })

        setActiveFrameworkId(fw.id)
        setScreen('editor')
      } finally {
        setRemoteOpenState('idle')
      }
    },
    [api],
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

  if (screen === 'home') {
    return (
      <HomeScreen
        frameworks={frameworks}
        onOpenFramework={openFramework}
        onOpenRemoteFramework={openRemoteFramework}
        remoteOpenLoading={remoteOpenState === 'loading'}
        onCreateNew={createNew}
      />
    )
  }

  if (!activeFramework) {
    return (
      <HomeScreen
        frameworks={frameworks}
        onOpenFramework={openFramework}
        onOpenRemoteFramework={openRemoteFramework}
        remoteOpenLoading={remoteOpenState === 'loading'}
        onCreateNew={createNew}
      />
    )
  }

  return (
    <EditorProvider initialGraph={activeFramework.graph} graphKey={activeFramework.id}>
      <EditorCanvas
        onBack={() => {
          setScreen('home')
        }}
      />
    </EditorProvider>
  )
}

