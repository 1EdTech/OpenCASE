import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { getAppConfig } from '@/app/config'
import { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'
import { createFetchHttpClient } from '@/infrastructure/caseApi/http'
import { Button } from '@/ui/shared/components/ui/button'

export default function LoginScreen() {
  const { status, error, setTenantId, signIn } = useAuth()
  const cfg = getAppConfig()
  const publicApi = useMemo(() => new CaseApiClient(createFetchHttpClient(cfg.opencaseBaseUrl)), [cfg.opencaseBaseUrl])

  const [email, setEmail] = useState('')
  const [uiState, setUiState] = useState<'idle' | 'loading'>('idle')
  const [hint, setHint] = useState<string | null>(null)

  const continueWithEmail = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) return
    setUiState('loading')
    setHint(null)
    try {
      const res = await publicApi.lookupTenantByEmail({ email: trimmed })
      const resolvedTenantId = res?.tenantId
      if (resolvedTenantId) {
        setTenantId(resolvedTenantId)
        await signIn(resolvedTenantId, { loginHint: trimmed })
        return
      }

      // Anti-enumeration UX: don't reveal whether this email exists / is mapped.
      setHint("If your account is recognized, you'll be redirected to sign in.")
    } catch {
      setHint("If your account is recognized, you'll be redirected to sign in.")
    } finally {
      setUiState('idle')
    }
  }, [email, publicApi, setTenantId, signIn])

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-md flex-col px-5 py-14">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Sign in</div>
          <div className="mt-1 text-sm text-slate-600">Enter your email to continue to your organization’s sign-in.</div>

          <div className="mt-5">
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-2 focus:outline-violet-700/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.org"
              autoComplete="email"
              inputMode="email"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void continueWithEmail()
              }}
            />
          </div>

          {hint ? <div className="mt-3 text-sm text-slate-600">{hint}</div> : null}
          {status === 'error' && error ? <div className="mt-3 text-sm text-red-700">{error}</div> : null}

          <div className="mt-5">
            <Button className="w-full" onClick={() => void continueWithEmail()} disabled={uiState === 'loading'}>
              {uiState === 'loading' ? 'Continuing…' : 'Continue'}
            </Button>
          </div>

          <div className="mt-4 text-xs text-slate-500">API: {cfg.opencaseBaseUrl}</div>
        </div>
      </div>
    </div>
  )
}

