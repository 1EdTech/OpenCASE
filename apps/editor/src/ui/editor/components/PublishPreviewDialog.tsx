import { useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shared/components/ui/dialog'

type PreviewResult = { request: unknown; format: { ok: boolean; status: number; body: unknown } }
type PublishResult = { ctid: string; registryEnvelopeId?: string; environment: string; resourceUrl: string; isUpdate: boolean; messages: string[] }
type UnpublishResult = { mode: 'delete' | 'deprecate'; environment: string; ctid: string; publishLinkCleared?: boolean; messages: string[] }
type Environment = 'sandbox' | 'production'
type PublishSummary = {
  ctid: string
  needsUpdate: boolean
  environments: Array<{ environment: Environment; resourceUrl: string; status?: string }>
}

type Props = {
  open: boolean
  onClose: () => void
  onRun: (_environment: Environment) => Promise<PreviewResult>
  onPublish?: (_environment: Environment) => Promise<PublishResult>
  onUnpublish?: (_args: { environment?: Environment; mode: 'delete' | 'deprecate' }) => Promise<UnpublishResult>
  publishSummary?: PublishSummary
}

/** Extract human-readable validation messages from a Registry Assistant response body. */
function messagesOf(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const raw = (body as Record<string, unknown>).Messages
  if (Array.isArray(raw)) return raw.map((m) => (typeof m === 'string' ? m : JSON.stringify(m)))
  return []
}

export default function PublishPreviewDialog({ open, onClose, onRun, onPublish, onUnpublish, publishSummary }: Readonly<Props>) {
  const [environment, setEnvironment] = useState<Environment>('sandbox')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PreviewResult | null>(null)
  // Which environment the current dry-run result was produced for (guards the Publish button).
  const [validatedEnv, setValidatedEnv] = useState<Environment | null>(null)

  const [confirmProd, setConfirmProd] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [published, setPublished] = useState<PublishResult | null>(null)

  const [removing, setRemoving] = useState<'delete' | 'deprecate' | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [removed, setRemoved] = useState<UnpublishResult | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Changing environment invalidates the prior dry-run and any publish/remove outcome.
  const changeEnv = (env: Environment) => {
    setEnvironment(env)
    setResult(null)
    setValidatedEnv(null)
    setError(null)
    setPublished(null)
    setPublishError(null)
    setConfirmProd(false)
    setRemoved(null)
    setRemoveError(null)
    setConfirmingDelete(false)
  }

  const unpublish = async (mode: 'delete' | 'deprecate') => {
    if (!onUnpublish) return
    setRemoving(mode)
    setRemoveError(null)
    setRemoved(null)
    try {
      setRemoved(await onUnpublish({ environment, mode }))
      setConfirmingDelete(false)
    } catch (e: any) {
      setRemoveError(e?.message ?? `${mode === 'delete' ? 'Delete' : 'Deprecate'} failed`)
    } finally {
      setRemoving(null)
    }
  }

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setValidatedEnv(null)
    setPublished(null)
    setPublishError(null)
    try {
      setResult(await onRun(environment))
      setValidatedEnv(environment)
    } catch (e: any) {
      setError(e?.message ?? 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  const publish = async () => {
    if (!onPublish) return
    setPublishing(true)
    setPublishError(null)
    setPublished(null)
    try {
      setPublished(await onPublish(environment))
    } catch (e: any) {
      setPublishError(e?.message ?? 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const messages = result ? messagesOf(result.format.body) : []
  // Publish is offered only once the dry-run for the *currently selected* environment passed.
  const canOfferPublish = Boolean(onPublish) && Boolean(result?.format.ok) && validatedEnv === environment && !published
  const publishDisabled = publishing || (environment === 'production' && !confirmProd)
  const envPublished = publishSummary?.environments.find((e) => e.environment === environment)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Publish to the Credential Registry</DialogTitle>
          <DialogDescription>
            Validate this framework with the Registry Assistant
            <code className="mx-1">/format</code> endpoint (dry-run), then publish it to the
            selected environment. Publishing reuses minted CTIDs so re-publishing updates the same resource.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium text-slate-700">Environment</span>
          {(['sandbox', 'production'] as const).map((env) => (
            <label key={env} className="inline-flex items-center gap-1.5">
              <input type="radio" name="publish-env" value={env} checked={environment === env} onChange={() => changeEnv(env)} className="h-4 w-4 text-violet-600 focus:ring-violet-500" />
              <span className={env === 'production' ? 'font-semibold text-rose-700' : 'text-slate-700'}>{env}</span>
            </label>
          ))}
          <Button size="sm" variant="secondary" onClick={() => void run()} disabled={loading || publishing}>
            {loading ? 'Running…' : 'Run dry-run'}
          </Button>
        </div>

        {environment === 'production' ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Production writes to the <strong>live</strong> Credential Registry. Confirm the dry-run looks right before publishing.
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

        {published ? (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-sm font-semibold text-emerald-900">
              {published.isUpdate ? 'Updated in the Credential Registry' : 'Published to the Credential Registry'} ({published.environment})
            </div>
            <dl className="space-y-1 text-sm text-emerald-900">
              <div className="flex gap-2">
                <dt className="font-medium">Resource</dt>
                <dd className="min-w-0 break-all">
                  <a href={published.resourceUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{published.resourceUrl}</a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">CTID</dt>
                <dd className="break-all">{published.ctid}</dd>
              </div>
              {published.registryEnvelopeId ? (
                <div className="flex gap-2">
                  <dt className="font-medium">Envelope</dt>
                  <dd className="break-all">{published.registryEnvelopeId}</dd>
                </div>
              ) : null}
            </dl>
            {published.messages.length ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-emerald-800">
                {published.messages.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}

        {publishError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{publishError}</div>
        ) : null}

        {onUnpublish && envPublished && !published && !removed ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-700">
              Currently in the registry ({environment}{envPublished.status === 'Deprecated' ? ', deprecated' : ''})
            </div>
            <a href={envPublished.resourceUrl} target="_blank" rel="noreferrer" className="block break-all text-sm text-violet-600 underline">{envPublished.resourceUrl}</a>
            {confirmingDelete ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <div className="mb-2">Permanently delete this framework from the {environment} registry? This can’t be undone. The local copy is kept and its publish link is cleared.</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void unpublish('delete')} disabled={removing !== null} className="bg-rose-600 hover:bg-rose-700">
                    {removing === 'delete' ? 'Deleting…' : 'Confirm delete'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={removing !== null}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void unpublish('deprecate')} disabled={removing !== null}>
                  {removing === 'deprecate' ? 'Deprecating…' : 'Deprecate'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmingDelete(true)} disabled={removing !== null} className="text-rose-700">
                  Delete…
                </Button>
              </div>
            )}
            <p className="text-xs text-slate-500">Deprecate keeps the resource but marks it inactive (CE-recommended). Delete removes it (best for sandbox cleanup).</p>
          </div>
        ) : null}

        {removed ? (
          <div className="space-y-1 rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">
            <div className="font-semibold">
              {removed.mode === 'delete' ? 'Deleted from' : 'Deprecated in'} the Credential Registry ({removed.environment})
            </div>
            {removed.mode === 'delete' ? (
              <div className="text-xs text-slate-600">{removed.publishLinkCleared ? 'Publish link cleared — a new publish will mint fresh CTIDs.' : 'Removed from this environment; other environments keep their link.'}</div>
            ) : null}
            {removed.messages.length ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">{removed.messages.map((m, i) => <li key={i}>{m}</li>)}</ul>
            ) : null}
          </div>
        ) : null}

        {removeError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{removeError}</div>
        ) : null}

        {canOfferPublish && environment === 'production' ? (
          <label className="inline-flex items-center gap-2 text-sm text-rose-800">
            <input type="checkbox" checked={confirmProd} onChange={(e) => setConfirmProd(e.target.checked)} className="h-4 w-4 text-rose-600 focus:ring-rose-500" />
            I understand this publishes to the live production registry.
          </label>
        ) : null}

        <DialogFooter>
          {canOfferPublish ? (
            <Button onClick={() => void publish()} disabled={publishDisabled} className={environment === 'production' ? 'bg-rose-600 hover:bg-rose-700' : undefined}>
              {publishing ? 'Publishing…' : `Publish to ${environment}`}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose} disabled={publishing}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
