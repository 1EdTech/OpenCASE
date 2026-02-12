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
      <DialogContent className="p-5 sm:p-8 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Import an existing framework</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Already have a framework published on a CASE server? Paste the link below to
            bring it into the editor so you can view or build on it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2.5">
            <Label htmlFor="import_url" className="text-base">Framework URL</Label>
            <Input
              id="import_url"
              className="text-base py-2.5"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://case.example.org/ims/case/v1p1/CFPackages/{id}"
              autoFocus
              disabled={importing}
            />
            <p className="text-base text-gray-500 leading-relaxed">
              Paste the full web address of the framework you want to import.
              Your administrator or framework provider can give you this link.
            </p>
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-base font-medium text-[#662F90] hover:text-[#552678]"
          >
            {showAdvanced ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="grid gap-2.5">
              <Label htmlFor="import_token" className="text-base">Access token (optional)</Label>
              <Input
                id="import_token"
                className="text-base py-2.5"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your access token here"
                disabled={importing}
              />
              <p className="text-base text-gray-500 leading-relaxed">
                If the framework server requires a login, paste the access token you were given.
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-base leading-relaxed text-red-800">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
                <div>
                  <div className="font-semibold">Something went wrong</div>
                  <div className="mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Validation warnings */}
          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-base leading-relaxed text-amber-800">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" />
                <div>
                  <div className="font-semibold">Imported with some notes</div>
                  {warnings.map((w) => (
                    <div key={w} className="mt-1">{w}</div>
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
