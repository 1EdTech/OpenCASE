import { useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shared/components/ui/dialog'

type PreviewResult = { request: unknown; format: { ok: boolean; status: number; body: unknown } }

type Props = {
  open: boolean
  onClose: () => void
  onRun: (_environment: 'sandbox' | 'production') => Promise<PreviewResult>
}

/** Extract human-readable validation messages from a Registry Assistant response body. */
function messagesOf(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const raw = (body as Record<string, unknown>).Messages
  if (Array.isArray(raw)) return raw.map((m) => (typeof m === 'string' ? m : JSON.stringify(m)))
  return []
}

export default function PublishPreviewDialog({ open, onClose, onRun }: Readonly<Props>) {
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PreviewResult | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await onRun(environment))
    } catch (e: any) {
      setError(e?.message ?? 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  const messages = result ? messagesOf(result.format.body) : []

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Preview publish (dry-run)</DialogTitle>
          <DialogDescription>
            Maps this framework to a Registry Assistant request and validates it via the
            <code className="mx-1">/format</code> endpoint. Nothing is published.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium text-slate-700">Environment</span>
          {(['sandbox', 'production'] as const).map((env) => (
            <label key={env} className="inline-flex items-center gap-1.5">
              <input type="radio" name="publish-env" value={env} checked={environment === env} onChange={() => setEnvironment(env)} className="h-4 w-4 text-violet-600 focus:ring-violet-500" />
              <span className={env === 'production' ? 'font-semibold text-rose-700' : 'text-slate-700'}>{env}</span>
            </label>
          ))}
          <Button size="sm" onClick={() => void run()} disabled={loading}>
            {loading ? 'Running…' : 'Run dry-run'}
          </Button>
        </div>

        {environment === 'production' ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Production validates against the live registry. This dry-run still publishes nothing, but double-check before a real publish.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</div>
        ) : null}

        {result ? (
          <div className="space-y-3 overflow-auto">
            <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${result.format.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
              {result.format.ok ? 'Registry Assistant: valid' : `Registry Assistant: not accepted (HTTP ${result.format.status})`}
            </div>
            {messages.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="mb-1 text-sm font-semibold text-amber-900">Messages</div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                  {messages.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            ) : null}
            <details>
              <summary className="cursor-pointer text-sm font-medium text-slate-600">Request sent to Registry Assistant</summary>
              <div className="mt-2 max-h-[40vh] overflow-auto rounded-lg border border-black/10 bg-slate-900">
                <pre className="p-4 text-xs leading-relaxed text-slate-100"><code>{JSON.stringify(result.request, null, 2)}</code></pre>
              </div>
            </details>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
