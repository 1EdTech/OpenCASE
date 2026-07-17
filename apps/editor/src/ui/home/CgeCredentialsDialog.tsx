import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/shared/components/ui/dialog'
import { Input } from '@/ui/shared/components/ui/input'
import { Label } from '@/ui/shared/components/ui/label'
import type { CaseApiClient, CgeCredentialsPublic } from '@/infrastructure/caseApi/CaseApiClient'

const DISCOVERY_PLACEHOLDER =
  'https://caseglobal-preview.1edtech.org/auth/realms/caseglobal/.well-known/openid-configuration'

export default function CgeCredentialsDialog({
  open,
  onClose,
  api,
  tenantId,
}: Readonly<{
  open: boolean
  onClose: () => void
  api: CaseApiClient
  tenantId: string
}>) {
  const [status, setStatus] = useState<CgeCredentialsPublic | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [discoveryUrl, setDiscoveryUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getCgeCredentials({ tenantId })
      setStatus(result)
      if (result.configured) {
        setDiscoveryUrl(result.discoveryUrl ?? '')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [api, tenantId])

  useEffect(() => {
    if (open) {
      setClientId('')
      setClientSecret('')
      setDiscoveryUrl('')
      setSuccess(null)
      setError(null)
      setConfirmDelete(false)
      void loadStatus()
    }
  }, [open, loadStatus])

  const handleSave = useCallback(async () => {
    const id = clientId.trim()
    const discovery = discoveryUrl.trim()
    const secret = clientSecret
    if (!discovery) {
      setError('OpenID discovery URL is required')
      return
    }
    if (!id) {
      setError('Client ID is required')
      return
    }
    if (!status?.configured && !secret.trim()) {
      setError('Client secret is required')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await api.putCgeCredentials({
        tenantId,
        clientId: id,
        clientSecret: secret,
        discoveryUrl: discovery,
      })
      setStatus(result)
      setClientSecret('')
      setDiscoveryUrl(result.discoveryUrl ?? discovery)
      setSuccess('CASE Global connection saved.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }, [api, tenantId, clientId, clientSecret, discoveryUrl, status?.configured])

  const handleTest = useCallback(async () => {
    setTesting(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await api.testCgeCredentials({ tenantId })
      if (result.ok) {
        setSuccess(result.message || 'Token minted successfully.')
      } else {
        setError(result.message || 'Credential test failed.')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setTesting(false)
    }
  }, [api, tenantId])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      await api.deleteCgeCredentials({ tenantId })
      setStatus({
        configured: false,
        clientIdMasked: null,
        discoveryUrl: null,
        updatedAt: null,
      })
      setDiscoveryUrl('')
      setClientId('')
      setClientSecret('')
      setConfirmDelete(false)
      setSuccess('CASE Global connection removed.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(false)
    }
  }, [api, tenantId])

  const handleClose = useCallback(() => {
    setConfirmDelete(false)
    setError(null)
    setSuccess(null)
    setClientId('')
    setClientSecret('')
    setDiscoveryUrl('')
    onClose()
  }, [onClose])

  const canSave =
    Boolean(discoveryUrl.trim() && clientId.trim()) &&
    (status?.configured || Boolean(clientSecret.trim()))

  return (
    <>
      <Dialog open={open && !confirmDelete} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>CASE Global</DialogTitle>
            <DialogDescription>
              Configure this organization&apos;s CASE Global OpenID discovery endpoint and consumer credentials.
              Token and API URLs are resolved automatically from discovery. The client secret is kept on the OpenCASE server only.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {success}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : status?.configured ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-800">Configured</p>
                <p className="font-mono text-xs text-gray-600">
                  Client ID: {status.clientIdMasked}
                </p>
                {status.discoveryUrl ? (
                  <p className="font-mono text-xs text-gray-600 break-all">
                    Discovery: {status.discoveryUrl}
                  </p>
                ) : null}
                {status.updatedAt ? (
                  <p className="text-xs text-gray-400">
                    Updated {new Date(status.updatedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No CASE Global connection configured yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cge_discovery_url" className="text-xs font-medium text-gray-600">
                  OpenID discovery URL
                </Label>
                <Input
                  id="cge_discovery_url"
                  value={discoveryUrl}
                  onChange={(e) => setDiscoveryUrl(e.target.value)}
                  placeholder={DISCOVERY_PLACEHOLDER}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-400">
                  Realm issuer URLs are accepted too — the well-known path is appended automatically.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cge_client_id" className="text-xs font-medium text-gray-600">
                  Client ID
                </Label>
                <Input
                  id="cge_client_id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder={status?.configured ? (status.clientIdMasked ?? 'Client ID') : 'Organisation API key client_id'}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cge_client_secret" className="text-xs font-medium text-gray-600">
                  Client secret
                </Label>
                <Input
                  id="cge_client_secret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={
                    status?.configured
                      ? 'Leave blank to keep current secret'
                      : 'Organisation API key client_secret'
                  }
                  className="font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {status?.configured
                ? 'Saving re-fetches discovery and updates credentials. Leave the secret blank to keep the current one.'
                : 'Saving fetches the discovery document and stores resolved endpoints with your credentials.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={saving || !canSave}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving...' : status?.configured ? 'Update connection' : 'Save connection'}
              </Button>
              {status?.configured ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testing}
                  onClick={() => void handleTest()}
                >
                  {testing ? 'Testing...' : 'Test connection'}
                </Button>
              ) : null}
              {status?.configured ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(true)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove CASE Global connection</DialogTitle>
            <DialogDescription>
              Remove the stored CASE Global discovery endpoint and API key for this organization?
              Search and import from CASE Global will stop working until a new connection is saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
