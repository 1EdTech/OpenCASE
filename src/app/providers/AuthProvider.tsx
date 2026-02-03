import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'
import { getAppConfig } from '@/app/config'

type AuthStatus = 'anonymous' | 'loading' | 'authenticated' | 'error'

type AuthContextValue = {
  status: AuthStatus
  tenantId: string
  user: User | null
  userName: string | null
  accessToken: string | null
  error: string | null
  setTenantId: (_tenantId: string) => void
  signIn: (_tenantId?: string, _options?: { loginHint?: string }) => Promise<void>
  completeSignIn: (_callbackUrl?: string) => Promise<void>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

const STORAGE_KEY_TENANT = 'case-editor:auth:tenantId'

function readTenantId(): string {
  const raw = globalThis.localStorage?.getItem(STORAGE_KEY_TENANT) ?? ''
  const trimmed = raw.trim()
  return trimmed || 'demo'
}

function writeTenantId(tenantId: string) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY_TENANT, tenantId)
  } catch {
    // ignore (storage may be unavailable)
  }
}

function pickUserName(user: User | null): string | null {
  const p = user?.profile as Record<string, unknown> | undefined
  if (!p) return null
  const candidates = [p.name, p.preferred_username, p.email].filter((v) => typeof v === 'string' && v.trim().length) as string[]
  return candidates[0] ?? null
}

function createUserManager(params: { authority: string; clientId: string; redirectUri: string; tenantId: string }) {
  // Use per-tenant prefixes to avoid mixing tokens/state across tenant client_ids.
  const prefix = `case-editor:oidc:${params.tenantId}:`
  const postLogoutRedirectUri = `${globalThis.location?.origin ?? ''}/#/login`
  return new UserManager({
    authority: params.authority,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    post_logout_redirect_uri: postLogoutRedirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    // The Keycloak client-per-tenant model means we need clean tenant switching.
    userStore: new WebStorageStateStore({ store: globalThis.localStorage, prefix }),
    stateStore: new WebStorageStateStore({ store: globalThis.sessionStorage, prefix }),
  })
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const cfg = getAppConfig()
  const [tenantId, setTenantIdState] = useState<string>(() => readTenantId())
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const redirectUri = `${globalThis.location?.origin ?? ''}/#/auth/callback`
  const clientId = `${cfg.oidcClientIdPrefix}${tenantId}`

  const userManager = useMemo(() => {
    return createUserManager({ authority: cfg.oidcAuthority, clientId, redirectUri, tenantId })
  }, [cfg.oidcAuthority, clientId, redirectUri, tenantId])

  // Load current user on startup (and whenever tenant changes).
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)
    userManager
      .getUser()
      .then((u) => {
        if (cancelled) return
        setUser(u)
        setStatus(u?.expired ? 'anonymous' : u ? 'authenticated' : 'anonymous')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setUser(null)
        setStatus('error')
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [userManager])

  // Keep state in sync with oidc-client events.
  useEffect(() => {
    const onLoaded = (u: User) => {
      setUser(u)
      setStatus(u.expired ? 'anonymous' : 'authenticated')
    }
    const onUnloaded = () => {
      setUser(null)
      setStatus('anonymous')
    }

    userManager.events.addUserLoaded(onLoaded)
    userManager.events.addUserUnloaded(onUnloaded)
    userManager.events.addAccessTokenExpired(onUnloaded)

    return () => {
      userManager.events.removeUserLoaded(onLoaded)
      userManager.events.removeUserUnloaded(onUnloaded)
      userManager.events.removeAccessTokenExpired(onUnloaded)
    }
  }, [userManager])

  const setTenantId = useCallback((nextTenantId: string) => {
    const trimmed = nextTenantId.trim()
    if (!trimmed) return
    writeTenantId(trimmed)
    setTenantIdState(trimmed)
  }, [])

  const signIn = useCallback(
    async (maybeTenantId?: string, options?: { loginHint?: string }) => {
      const nextTenantId = (maybeTenantId ?? tenantId).trim()
      if (!nextTenantId) throw new Error('tenantId is required')
      if (nextTenantId !== tenantId) setTenantId(nextTenantId)

      setStatus('loading')
      setError(null)
      // Important: tenantId changes affect client_id. If the caller supplied a different tenantId,
      // we must redirect using a UserManager configured for that tenant immediately (state updates
      // are async, and React StrictMode can remount in dev).
      const mgr =
        nextTenantId === tenantId
          ? userManager
          : createUserManager({
              authority: cfg.oidcAuthority,
              clientId: `${cfg.oidcClientIdPrefix}${nextTenantId}`,
              redirectUri,
              tenantId: nextTenantId,
            })
      await mgr.signinRedirect({
        extraQueryParams: options?.loginHint ? { login_hint: options.loginHint } : undefined,
      })
    },
    [tenantId, userManager, setTenantId, cfg.oidcAuthority, cfg.oidcClientIdPrefix, redirectUri],
  )

  const completeSignIn = useCallback(async (callbackUrl?: string) => {
    setStatus('loading')
    setError(null)
    try {
      // Keycloak may return `...?code&state#/auth/callback` (query before hash) OR put params after the hash.
      // `signinRedirectCallback()` can accept an explicit URL; we normalize the two cases.
      const href = callbackUrl ?? (globalThis.location?.href ?? '')
      const parsed = new URL(href)
      const hash = parsed.hash ?? ''

      const isHashContainsQuery = hash.includes('?') && (hash.includes('code=') || hash.includes('state='))
      const normalizedCallbackUrl = isHashContainsQuery ? href.replace(hash, '') + hash.slice(1) : href

      const u = await userManager.signinRedirectCallback(normalizedCallbackUrl)
      setUser(u)
      setStatus(u.expired ? 'anonymous' : 'authenticated')
    } catch (e: unknown) {
      setUser(null)
      setStatus('error')
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }, [userManager])

  const signOut = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      await userManager.signoutRedirect({
        post_logout_redirect_uri: `${globalThis.location?.origin ?? ''}/#/login`,
      })
    } catch (e: unknown) {
      // Some Keycloak clients may not have front-channel logout configured; still clear local state.
      await userManager.removeUser()
      setUser(null)
      setStatus('anonymous')
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [userManager])

  const accessToken = user?.access_token ?? null
  const userName = useMemo(() => pickUserName(user), [user])

  const getAccessToken = useCallback(async () => {
    const u = await userManager.getUser()
    if (!u || u.expired) return null
    return u.access_token
  }, [userManager])

  const value: AuthContextValue = useMemo(
    () => ({
      status,
      tenantId,
      user,
      userName,
      accessToken,
      error,
      setTenantId,
      signIn,
      completeSignIn,
      signOut,
      getAccessToken,
    }),
    [status, tenantId, user, userName, accessToken, error, setTenantId, signIn, completeSignIn, signOut, getAccessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

