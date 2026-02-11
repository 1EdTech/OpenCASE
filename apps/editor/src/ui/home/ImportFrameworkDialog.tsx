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
import { ArrowPathIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'

export type ImportResult = {
  status: string
  id: string
  version: number
  validationWarnings?: string[]
}

export default function ImportFrameworkDialog({
  open,
  onCancel,
  onImport,
}: Readonly<{
  open: boolean
  onCancel: () => void
  onImport: (_endpointUrl: string, _accessToken?: string) => Promise<ImportResult>
}>) {
  const [endpointUrl, setEndpointUrl] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const canImport = endpointUrl.trim().length > 0 && !importing

  const handleImport = useCallback(async () => {
    if (!canImport) return
    setImporting(true)
    setError(null)
    setWarnings([])
    try {
      const result = await onImport(
        endpointUrl.trim(),
        accessToken.trim() || undefined,
      )
      if (result.validationWarnings?.length) {
        setWarnings(result.validationWarnings)
      }
      // Reset form state on success (dialog will be closed by parent)
      setEndpointUrl('')
      setAccessToken('')
      setShowAdvanced(false)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
    }
  }, [canImport, endpointUrl, accessToken, onImport])

  const handleCancel = useCallback(() => {
    setEndpointUrl('')
    setAccessToken('')
    setShowAdvanced(false)
    setError(null)
    setWarnings([])
    setImporting(false)
    onCancel()
  }, [onCancel])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import framework</DialogTitle>
          <DialogDescription>
            Enter a CASE CFPackage endpoint URL to import an external framework.
            The framework will be fetched, validated, and stored locally.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="import_url">CFPackage URL</Label>
            <Input
              id="import_url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://case.example.org/ims/case/v1p1/CFPackages/{id}"
              autoFocus
              disabled={importing}
            />
            <p className="text-xs text-gray-400">
              The full URL to a CASE CFPackage endpoint (e.g. /ims/case/v1p1/CFPackages/&lt;uuid&gt;)
            </p>
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-[#662F90] hover:text-[#552678]"
          >
            {showAdvanced ? (
              <ChevronUpIcon className="h-3 w-3" />
            ) : (
              <ChevronDownIcon className="h-3 w-3" />
            )}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="grid gap-1.5">
              <Label htmlFor="import_token">Access token (optional)</Label>
              <Input
                id="import_token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Bearer token for authenticated endpoints"
                disabled={importing}
              />
              <p className="text-xs text-gray-400">
                If the source CASE server requires authentication, provide an access token.
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <div className="font-medium">Import failed</div>
                  <div className="mt-0.5">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Validation warnings */}
          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <div className="font-medium">Imported with warnings</div>
                  {warnings.map((w) => (
                    <div key={w} className="mt-0.5">{w}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleCancel} disabled={importing}>
            Cancel
          </Button>
          <Button
            disabled={!canImport}
            onClick={() => void handleImport()}
          >
            {importing ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Importing\u2026
              </>
            ) : (
              'Import'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
