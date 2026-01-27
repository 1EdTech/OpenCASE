import { useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shared/components/ui/dialog'
import { Input } from '@/ui/shared/components/ui/input'
import { Label } from '@/ui/shared/components/ui/label'
import { Textarea } from '@/ui/shared/components/ui/textarea'

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
  onCreate: (_draft: CreateFrameworkDraft) => void
}) {
  const [title, setTitle] = useState('')
  const [frameworkType, setFrameworkType] = useState('K-12')
  const [adoptionStatus, setAdoptionStatus] = useState('Draft')
  const [description, setDescription] = useState('')

  const canCreate = useMemo(() => title.trim().length > 0, [title])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel()
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
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fw_type">Framework type (optional)</Label>
            <Input id="fw_type" value={frameworkType} onChange={(e) => setFrameworkType(e.target.value)} placeholder="e.g. K-12" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fw_status">Adoption status (optional)</Label>
            <Input id="fw_status" value={adoptionStatus} onChange={(e) => setAdoptionStatus(e.target.value)} placeholder="e.g. Draft" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fw_desc">Description (optional)</Label>
            <Textarea
              id="fw_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description to help others understand this framework."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!canCreate}
            onClick={() =>
              onCreate({
                title: title.trim(),
                frameworkType: frameworkType.trim() || undefined,
                adoptionStatus: adoptionStatus.trim() || undefined,
                description: description.trim() || undefined,
              })
            }
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

