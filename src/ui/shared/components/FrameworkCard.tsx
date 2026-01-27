import { PlusIcon } from '@heroicons/react/24/solid'
import type { ReactNode } from 'react'
import type { CFDocument } from '@/domain/case/types'
import { Button } from '@/ui/shared/components/ui/button'
import { cn } from '@/lib/utils'

export function FrameworkCard({
  cfDocument,
  selected,
  rightHint,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionIcon = 'plus',
  onClick,
  className,
  children,
}: {
  cfDocument: Pick<CFDocument, 'title' | 'creator' | 'description' | 'frameworkType' | 'adoptionStatus'>
  selected?: boolean
  rightHint?: string
  onPrimaryAction?: () => void
  primaryActionLabel?: string
  primaryActionIcon?: 'plus' | 'none'
  onClick?: () => void
  className?: string
  children?: ReactNode
}) {
  const title = cfDocument.title ?? 'Untitled framework'
  const creator = cfDocument.creator
  const frameworkType = (cfDocument as { frameworkType?: string }).frameworkType
  const adoptionStatus = (cfDocument as { adoptionStatus?: string }).adoptionStatus
  const description = (cfDocument as { description?: string }).description

  const clickable = Boolean(onClick)

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return
        if (e.key === 'Enter' || e.key === ' ') onClick?.()
      }}
      className={cn(
        'group relative h-full w-full rounded-2xl border bg-gradient-to-b from-violet-50 to-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md',
        selected ? 'border-violet-500 shadow-md ring-2 ring-violet-500/15' : 'border-violet-200',
        clickable ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2' : '',
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-semibold text-white">Framework</div>
            {frameworkType ? (
              <div className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-medium text-violet-700">
                {frameworkType}
              </div>
            ) : null}
            {adoptionStatus ? (
              <div className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-medium text-violet-700">
                {adoptionStatus}
              </div>
            ) : null}
          </div>
          <div className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-slate-900">{title}</div>
          {creator ? <div className="mt-1 text-xs text-slate-600">Created by {creator}</div> : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          {rightHint ? <div className="text-[10px] font-medium text-slate-600">{rightHint}</div> : null}

          {primaryActionLabel && onPrimaryAction ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              className="rounded-full border border-violet-300 bg-white font-semibold text-violet-700 shadow-sm hover:bg-violet-50"
              onClick={(e) => {
                e.stopPropagation()
                onPrimaryAction()
              }}
            >
              {primaryActionIcon === 'plus' ? <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {primaryActionLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {description ? (
        <div className="text-sm leading-snug text-slate-700">
          <div className="line-clamp-3">{description}</div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">Add a description to help others understand this framework.</div>
      )}

      {children}
    </div>
  )
}

