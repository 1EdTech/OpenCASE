import { useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Input } from '@/ui/shared/components/ui/input'
import { Label } from '@/ui/shared/components/ui/label'
import { Textarea } from '@/ui/shared/components/ui/textarea'

export type ExternalFrameworkDraft = {
  title: string
  uri?: string
  description?: string
  source?: string
}

type Props = {
  open: boolean
  onCancel: () => void
  onCreate: (draft: ExternalFrameworkDraft) => void
}

export default function AddExternalFrameworkDialog({ open, onCancel, onCreate }: Readonly<Props>) {
  const [draft, setDraft] = useState<ExternalFrameworkDraft>({ title: '' })

  const handleCreate = () => {
    if (!draft.title.trim()) return
    onCreate({
      title: draft.title.trim(),
      uri: draft.uri?.trim() || undefined,
      description: draft.description?.trim() || undefined,
      source: draft.source?.trim() || undefined,
    })
    setDraft({ title: '' })
  }

  const handleCancel = () => {
    setDraft({ title: '' })
    onCancel()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} aria-hidden="true" />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="external-fw-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-black/10 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-black/10 px-5 py-4">
          <h2 id="external-fw-title" className="text-lg font-semibold text-slate-900">
            Add External Framework
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Reference an external framework to link CASE items to.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5">
          <div>
            <Label htmlFor="ext-title" className="text-sm font-medium text-slate-900">
              Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="ext-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g., Common Core State Standards"
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="ext-source" className="text-sm font-medium text-slate-900">
              Source
            </Label>
            <Input
              id="ext-source"
              value={draft.source ?? ''}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              placeholder="e.g., State Department of Education"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="ext-uri" className="text-sm font-medium text-slate-900">
              URI / Identifier
            </Label>
            <Input
              id="ext-uri"
              value={draft.uri ?? ''}
              onChange={(e) => setDraft({ ...draft, uri: e.target.value })}
              placeholder="e.g., https://example.org/framework/123"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="ext-description" className="text-sm font-medium text-slate-900">
              Description
            </Label>
            <Textarea
              id="ext-description"
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Optional notes about this external framework..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-black/10 px-5 py-4">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!draft.title.trim()}>
            Add Framework
          </Button>
        </div>
      </div>
    </div>
  )
}
