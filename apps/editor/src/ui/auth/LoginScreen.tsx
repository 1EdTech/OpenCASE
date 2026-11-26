import { useCallback, useState } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/ui/shared/components/ui/button'

export default function LoginScreen() {
  const { status, error, signIn } = useAuth()
  const [signInError, setSignInError] = useState<string | null>(null)

  const handleSignIn = useCallback(() => {
    setSignInError(null)
    signIn().catch((err: unknown) => {
      console.error('[LoginScreen] sign-in failed:', err)
      setSignInError(err instanceof Error ? err.message : String(err))
    })
  }, [signIn])

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-md flex-col px-5 py-14">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Welcome to OpenCASE</div>
          <div className="mt-1 text-sm text-slate-600">Sign in to continue.</div>
          {signInError ? <div className="mt-3 text-sm text-red-700">{signInError}</div> : null}
          {status === 'error' && error ? <div className="mt-3 text-sm text-red-700">{error}</div> : null}
          <div className="mt-5">
            <Button className="w-full" onClick={handleSignIn} disabled={status === 'loading'}>
              {status === 'loading' ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
