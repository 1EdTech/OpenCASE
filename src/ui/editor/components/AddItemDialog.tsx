import { useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shared/components/ui/dialog'
import { Input } from '@/ui/shared/components/ui/input'
import { Label } from '@/ui/shared/components/ui/label'
import { Textarea } from '@/ui/shared/components/ui/textarea'

export type AddItemDraft = {
  fullStatement: string
  abbreviatedStatement?: string
  alternativeLabel?: string
  humanCodingScheme?: string
  CFItemType?: string
  subjectCsv?: string
  educationLevelCsv?: string
  conceptKeywordsCsv?: string
  notes?: string
}

type Props = {
  open: boolean
  parentLabel?: string
  draft: AddItemDraft
  onChange: (patch: Partial<AddItemDraft>) => void
  onCancel: () => void
  onCreate: () => void
}

export default function AddItemDialog({ open, parentLabel, draft, onChange, onCancel, onCreate }: Readonly<Props>) {
  const [touched, setTouched] = useState(false)

  const statementError = useMemo(() => {
    if (!touched) return null
    return draft.fullStatement.trim().length ? null : 'Statement is required.'
  }, [draft.fullStatement, touched])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Add item</DialogTitle>
          <DialogDescription>
            {parentLabel ? (
              <>
                You’re adding a child of <span className="font-medium text-slate-900">{parentLabel}</span>.
              </>
            ) : (
              'Enter the statement and basic information. You can refine details later.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="add-item-statement">Statement</Label>
            <Textarea
              id="add-item-statement"
              rows={4}
              value={draft.fullStatement}
              onChange={(e) => {
                if (!touched) setTouched(true)
                onChange({ fullStatement: e.target.value })
              }}
              placeholder="Write the full statement for this item…"
            />
            {statementError ? <div className="text-sm text-red-600">{statementError}</div> : null}
          </div>

          <div className="grid gap-3 rounded-xl border border-black/10 bg-slate-900/2 p-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">About this item</div>
              <div className="text-xs text-slate-600">Basic metadata to help people identify it.</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="add-item-code">Code</Label>
                <Input
                  id="add-item-code"
                  value={draft.humanCodingScheme ?? ''}
                  onChange={(e) => onChange({ humanCodingScheme: e.target.value })}
                  placeholder="e.g. 3.NF.A.1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-item-type">Type</Label>
                <Input
                  id="add-item-type"
                  value={draft.CFItemType ?? ''}
                  onChange={(e) => onChange({ CFItemType: e.target.value })}
                  placeholder="e.g. Standard, Skill…"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-item-label">Label (optional)</Label>
                <Input
                  id="add-item-label"
                  value={draft.alternativeLabel ?? ''}
                  onChange={(e) => onChange({ alternativeLabel: e.target.value })}
                  placeholder="Short label"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-item-abbrev">Short statement (optional)</Label>
                <Input
                  id="add-item-abbrev"
                  value={draft.abbreviatedStatement ?? ''}
                  onChange={(e) => onChange({ abbreviatedStatement: e.target.value })}
                  placeholder="Short display text"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="add-item-subject">Subject (comma-separated)</Label>
                <Input
                  id="add-item-subject"
                  value={draft.subjectCsv ?? ''}
                  onChange={(e) => onChange({ subjectCsv: e.target.value })}
                  placeholder="e.g. Math, Algebra"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-item-edlevel">Education level (comma-separated)</Label>
                <Input
                  id="add-item-edlevel"
                  value={draft.educationLevelCsv ?? ''}
                  onChange={(e) => onChange({ educationLevelCsv: e.target.value })}
                  placeholder="e.g. Grade 3, Grade 4"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-item-keywords">Keywords (comma-separated)</Label>
              <Input
                id="add-item-keywords"
                value={draft.conceptKeywordsCsv ?? ''}
                onChange={(e) => onChange({ conceptKeywordsCsv: e.target.value })}
                placeholder="e.g. fractions, number line"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-item-notes">Notes</Label>
              <Textarea
                id="add-item-notes"
                rows={3}
                value={draft.notes ?? ''}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Optional context for your team…"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (!draft.fullStatement.trim()) return
              onCreate()
            }}
          >
            Create item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

