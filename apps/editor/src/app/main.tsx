import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import App from './App'
import { runSilentRenewCallback } from './providers/AuthProvider'

const hash = globalThis.location?.hash ?? ''

if (hash.startsWith('#/auth/silent-callback')) {
  // Loaded inside the hidden iframe oidc-client-ts uses for automatic silent
  // renewal — just forward the auth response to the parent window, don't mount the app.
  void runSilentRenewCallback()
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

