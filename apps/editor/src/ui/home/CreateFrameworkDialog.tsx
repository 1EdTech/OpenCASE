import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shared/components/ui/dialog'
import { Input } from '@/ui/shared/components/ui/input'
import { Label } from '@/ui/shared/components/ui/label'
import { Textarea } from '@/ui/shared/components/ui/textarea'
import { ComboboxInput } from '@/ui/shared/components/ui/combobox-input'
import { ADOPTION_STATUS_OPTIONS } from '@/domain/framework/model/adoptionStatus'
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'

export type CreateFrameworkDraft = {
  title: string
  frameworkType?: string
  adoptionStatus?: string
  description?: string
}

export default function CreateFrameworkDialog({
  open,
  onCancel,
  onCreate,
}: {
  open: boolean
  onCancel: () => void
  onCreate: (_draft: CreateFrameworkDraft) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [frameworkType, setFrameworkType] = useState('K-12')
  const [adoptionStatus, setAdoptionStatus] = useState('Draft')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = useMemo(() => !isCreating && title.trim().length > 0, [title, isCreating])

  const resetForm = useCallback(() => {
    setTitle('')
    setFrameworkType('K-12')
    setAdoptionStatus('Draft')
    setDescription('')
    setIsCreating(false)
    setError(null)
  }, [])

  const handleCreate = useCallback(async () => {
    if (!canCreate) return
    setIsCreating(true)
    setError(null)
    try {
      await onCreate({
        title: title.trim(),
        frameworkType: frameworkType.trim() || undefined,
        adoptionStatus: adoptionStatus.trim() || undefined,
        description: description.trim() || undefined,
      })
      // Reset form state on success (dialog will be closed by parent).
      resetForm()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setIsCreating(false)
    }
  }, [canCreate, title, frameworkType, adoptionStatus, description, onCreate, resetForm])

  const handleCancel = useCallback(() => {
    setError(null)
    onCancel()
  }, [onCancel])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isCreating) handleCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create framework</DialogTitle>
          <DialogDescription>Enter a title to start editing. You can fill in the rest later.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="fw_title">Title</Label>
            <Input
              id="fw_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade 3–5 Mathematics"
              autoFocus
              disabled={isCreating}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fw_type">Framework type (optional)</Label>
            <Input
              id="fw_type"
              value={frameworkType}
              onChange={(e) => setFrameworkType(e.target.value)}
              placeholder="e.g. K-12"
              disabled={isCreating}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fw_status">Adoption status (optional)</Label>
            <ComboboxInput
              id="fw_status"
              value={adoptionStatus}
              onChange={setAdoptionStatus}
              options={ADOPTION_STATUS_OPTIONS}
              placeholder="Select or type a status"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fw_desc">Description (optional)</Label>
            <Textarea
              id="fw_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description to help others understand this framework."
              disabled={isCreating}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-base leading-relaxed text-red-800">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
                <div>
                  <div className="font-semibold">Couldn&rsquo;t create framework</div>
                  <div className="mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button disabled={!canCreate} onClick={() => void handleCreate()}>
            {isCreating ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Creating&hellip;
              </>
            ) : (
              'OK'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

