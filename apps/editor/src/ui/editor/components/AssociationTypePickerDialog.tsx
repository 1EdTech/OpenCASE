import { Button } from '@/ui/shared/components/ui/button'
import { CASE_ASSOCIATION_TYPES } from '@/ui/editor/reactflow/types'

type Props = {
  open: boolean
  defaultType?: string
  remoteLabel: string
  onCancel: () => void
  onConfirm: (associationType: string) => void
}

export default function AssociationTypePickerDialog({
  open,
  defaultType = 'isRelatedTo',
  remoteLabel,
  onCancel,
  onConfirm,
}: Readonly<Props>) {
  if (!open) return null

  const options = CASE_ASSOCIATION_TYPES.filter((t) => t !== 'isChildOf')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-slate-900">Link association type</h3>
        <p className="mt-1 text-sm text-slate-600">
          Link to: <span className="font-medium">{remoteLabel}</span>
        </p>
        <div className="mt-4 space-y-2">
          {options.map((type) => (
            <Button
              key={type}
              type="button"
              variant={type === defaultType ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => onConfirm(type)}
            >
              {type}
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" className="mt-3 w-full" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
