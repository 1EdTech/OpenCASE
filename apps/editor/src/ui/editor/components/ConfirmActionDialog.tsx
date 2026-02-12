import type { CheckedState } from '@radix-ui/react-checkbox'
import { Button } from '@/ui/shared/components/ui/button'
import { Checkbox } from '@/ui/shared/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/shared/components/ui/dialog'
import { Label } from '@/ui/shared/components/ui/label'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  /** Optional reattach-children checkbox (only shown for item removal) */
  showReattach?: boolean
  reattachChildren?: boolean
  reattachLabel?: string
  onReattachChildrenChange?: (value: boolean) => void
  onCancel: () => void
  onConfirm: (options: { reattachChildren: boolean }) => void
}

export default function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  showReattach,
  reattachChildren = true,
  reattachLabel,
  onReattachChildrenChange,
  onCancel,
  onConfirm,
}: Readonly<Props>) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {showReattach && reattachLabel && onReattachChildrenChange ? (
          <div className="rounded-xl border border-black/10 bg-slate-900/2 p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="reattach-children"
                checked={reattachChildren}
                onCheckedChange={(v: CheckedState) => onReattachChildrenChange(Boolean(v))}
              />
              <div className="grid gap-1">
                <Label htmlFor="reattach-children" className="text-sm font-medium text-slate-900">
                  {reattachLabel}
                </Label>
                <div className="text-xs text-slate-600">
                  This helps preserve the hierarchy when you remove an intermediate item.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm({ reattachChildren: reattachChildren ?? true })
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
