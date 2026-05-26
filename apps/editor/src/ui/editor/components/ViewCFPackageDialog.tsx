import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shared/components/ui/dialog'
import type { CFPackage } from '@/domain/case/types'
import type { CaseVersion } from '@/application/framework/mappers/case/CasePackageSnapshot'

type Props = {
  open: boolean
  onClose: () => void
  cfPackage: CFPackage | null
  caseVersion: CaseVersion
  loading?: boolean
}

export default function ViewCFPackageDialog({ open, onClose, cfPackage, caseVersion, loading }: Readonly<Props>) {
  const [copied, setCopied] = useState(false)

  const jsonString = useMemo(() => {
    if (!cfPackage) return ''
    return JSON.stringify(cfPackage, null, 2)
  }, [cfPackage])

  const copyToClipboard = useCallback(async () => {
    if (!jsonString || loading) return
    try {
      await globalThis.navigator?.clipboard?.writeText(jsonString)
      setCopied(true)
      globalThis.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = jsonString
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      globalThis.setTimeout(() => setCopied(false), 2000)
    }
  }, [jsonString, loading])

  const downloadJson = useCallback(() => {
    if (!cfPackage || loading) return
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const title = cfPackage.CFDocument?.title?.replace(/[^a-zA-Z0-9]/g, '_') ?? 'framework'
    a.download = `${title}_CFPackage.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [cfPackage, loading, jsonString])

  const stats = useMemo(() => {
    if (!cfPackage) return null
    return {
      items: cfPackage.CFItems?.length ?? 0,
      associations: cfPackage.CFAssociations?.length ?? 0,
    }
  }, [cfPackage])

  const versionLabel = caseVersion === '1.0' ? 'v1p0' : caseVersion === '1.1' ? 'v1p1' : 'unknown'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>CFPackage JSON</DialogTitle>
          <DialogDescription>
            CASE {versionLabel} format. Copy this JSON to validate or use in other tools.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              {versionLabel}
            </span>
          </div>
          {stats ? (
            <>
              <div>{stats.items} items</div>
              <div>{stats.associations} associations</div>
            </>
          ) : null}
        </div>

        <div className="relative max-h-[50vh] overflow-auto rounded-lg border border-black/10 bg-slate-900">
          <pre className="p-4 text-xs leading-relaxed text-slate-100">
            <code>{loading ? 'Loading…' : jsonString || 'No CFPackage data'}</code>
          </pre>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" onClick={downloadJson} disabled={!cfPackage || loading}>
            Download JSON
          </Button>
          <Button onClick={copyToClipboard} disabled={!cfPackage || loading}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
