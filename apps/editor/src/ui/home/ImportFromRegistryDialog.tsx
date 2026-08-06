import { useCallback, useState } from 'react'
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
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

export type RegistryImportResult = {
  status: string
  id: string
  version: number
  itemCount: number
  associationCount: number
}

export default function ImportFromRegistryDialog({
  open,
  onCancel,
  onImport,
}: Readonly<{
  open: boolean
  onCancel: () => void
  onImport: (_registryUrl: string) => Promise<RegistryImportResult>
}>) {
  const [registryUrl, setRegistryUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canImport = registryUrl.trim().length > 0 && !importing

  const handleImport = useCallback(async () => {
    if (!canImport) return
    setImporting(true)
    setError(null)
    try {
      await onImport(registryUrl.trim())
      setRegistryUrl('')
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
    }
  }, [canImport, registryUrl, onImport])

  const handleCancel = useCallback(() => {
    setRegistryUrl('')
    setError(null)
    setImporting(false)
    onCancel()
  }, [onCancel])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel() }}>
      <DialogContent className="p-5 sm:p-8 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Import from Credential Registry</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Paste a Credential Engine Registry URL or CTID to import a competency framework.
            The framework will be converted from CTDL-ASN to CASE format and added to your library.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2.5">
            <Label htmlFor="registry_url" className="text-base">Registry URL or CTID</Label>
            <Input
              id="registry_url"
              className="text-base py-2.5"
              value={registryUrl}
              onChange={(e) => setRegistryUrl(e.target.value)}
              placeholder="https://credentialengineregistry.org/resources/ce-…"
              autoFocus
              disabled={importing}
            />
            <p className="text-base text-gray-500 leading-relaxed">
              Paste the full resource URL from the Credential Engine Registry, or just the CTID
              (e.g.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-sm font-mono">
                ce-abf4a1d5-…
              </code>
              ).
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-base leading-relaxed text-red-800">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
                <div>
                  <div className="font-semibold">Import failed</div>
                  <div className="mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleCancel} disabled={importing}>
            Cancel
          </Button>
          <Button disabled={!canImport} onClick={() => void handleImport()}>
            {importing ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Importing&hellip;
              </>
            ) : (
              'Import framework'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
