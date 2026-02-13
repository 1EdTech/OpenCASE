import { PlusIcon, TrashIcon, CloudArrowDownIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/solid'
import type { ReactNode } from 'react'
import type { CFDocument } from '@/domain/case/types'
import { Button } from '@/ui/shared/components/ui/button'
import { cn } from '@/lib/utils'
import { normalizeAdoptionStatus } from '@/domain/framework/model/adoptionStatus'

/** Status badge styling — prominent, with strong color coding */
const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  Draft: {
    label: 'Draft',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    dot: 'bg-[#FF941F]',
  },
  'Pending Implementation': {
    label: 'Pending',
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    dot: 'bg-[#29ABE3]',
  },
  Implemented: {
    label: 'Published',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500',
  },
  Retired: {
    label: 'Retired',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    dot: 'bg-[#919496]',
  },
}

function formatRelativeDate(iso: string | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86_400_000)
    if (diffDays < 1) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 30) return `${diffDays} days ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return null
  }
}

type Props = {
  cfDocument: Pick<CFDocument, 'title' | 'creator' | 'description' | 'frameworkType' | 'adoptionStatus'>
  selected?: boolean
  rightHint?: string
  onPrimaryAction?: () => void
  primaryActionLabel?: string
  primaryActionIcon?: 'plus' | 'none'
  onDelete?: () => void
  deleteDisabled?: boolean
  /** Visual style for the action button: 'archive' shows amber archive icon, 'delete' shows red trash icon */
  actionStyle?: 'archive' | 'delete'
  /** Restore callback — shown on archived cards to unarchive */
  onRestore?: () => void
  restoreDisabled?: boolean
  onClick?: () => void
  className?: string
  children?: ReactNode
  /** Show an "Unsaved" indicator for locally-created frameworks */
  isUnsaved?: boolean
  /** ISO date string for the last change — shown in the card footer */
  lastChanged?: string
  /** URL the framework was imported from — shows an "Imported" badge when set */
  sourcePackageURI?: string
  /** True when an imported framework has been locally modified */
  isModifiedFromSource?: boolean
}

export function FrameworkCard({
  cfDocument,
  selected,
  rightHint,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionIcon = 'plus',
  onDelete,
  deleteDisabled,
  actionStyle = 'archive',
  onRestore,
  restoreDisabled,
  onClick,
  className,
  children,
  isUnsaved,
  lastChanged,
  sourcePackageURI,
  isModifiedFromSource,
}: Readonly<Props>) {
  const title = cfDocument.title ?? 'Untitled framework'
  const frameworkType = (cfDocument as { frameworkType?: string }).frameworkType
  const rawAdoptionStatus = (cfDocument as { adoptionStatus?: string }).adoptionStatus
  const adoptionStatus = normalizeAdoptionStatus(rawAdoptionStatus) ?? rawAdoptionStatus
  const description = (cfDocument as { description?: string }).description

  const clickable = Boolean(onClick)

  const relDate = formatRelativeDate(lastChanged)
  const statusInfo = adoptionStatus ? STATUS_STYLE[adoptionStatus] : undefined

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      onClick={clickable ? onClick : undefined}
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-lg',
        selected ? 'border-[#662F90] shadow-md ring-2 ring-[#662F90]/25' : 'border-gray-200',
        clickable ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-[#662F90]/40 focus-visible:outline-offset-2' : '',
        className,
      )}
    >
      {/* ── Card header with gradient accent ───────────────────── */}
      <div className="flex items-center justify-between gap-2 rounded-t-[7px] bg-linear-to-br from-[#000072] via-[#3d1a9b] to-[#662F90] px-4 py-2.5">
        <div className="flex items-center gap-2">
          {frameworkType ? (
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white">
              {frameworkType}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {!clickable && primaryActionLabel && onPrimaryAction ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              onClick={(e) => {
                e.stopPropagation()
                onPrimaryAction()
              }}
            >
              {primaryActionIcon === 'plus' ? <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {primaryActionLabel}
            </Button>
          ) : null}
          {onRestore ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={restoreDisabled}
              className="rounded-full text-white/50 opacity-0 transition-opacity hover:bg-white/10 hover:text-emerald-300 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onRestore()
              }}
              title="Restore framework"
            >
              <ArrowUturnLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={deleteDisabled}
              className={cn(
                'rounded-full opacity-0 transition-opacity group-hover:opacity-100',
                actionStyle === 'delete'
                  ? 'text-white/50 hover:bg-white/10 hover:text-red-300'
                  : 'text-white/50 hover:bg-white/10 hover:text-amber-300',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              title={actionStyle === 'delete' ? 'Delete permanently' : 'Archive framework'}
            >
              {actionStyle === 'delete' ? (
                <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ArchiveBoxArrowDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Card body ──────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-3">
        <div className="shrink-0 line-clamp-2 text-left text-base font-semibold leading-snug text-[#2E2F2F]">{title}</div>

        {description ? (
          <div className="mt-2 min-h-0 flex-1 overflow-hidden text-left text-sm leading-snug text-[#2E2F2F]/70">
            <div className="line-clamp-3">{description}</div>
          </div>
        ) : (
          <div className="mt-2 min-h-0 flex-1 text-left text-sm text-gray-400 italic">No description</div>
        )}

        {/* ── Status + meta footer ─────────────────────────────── */}
        <div className="mt-auto shrink-0 flex items-center justify-between gap-2 pt-4">
          <div className="flex items-center gap-2">
            {adoptionStatus && statusInfo ? (
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', statusInfo.bg, statusInfo.text)}>
                <span className={cn('inline-block h-2 w-2 rounded-full', statusInfo.dot)} />
                {statusInfo.label}
              </span>
            ) : adoptionStatus ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                {adoptionStatus}
              </span>
            ) : null}
            {isUnsaved ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Unsaved
              </span>
            ) : null}
            {sourcePackageURI ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                  isModifiedFromSource
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-sky-100 text-sky-700',
                )}
                title={isModifiedFromSource ? `Imported from ${sourcePackageURI} (modified)` : `Imported from ${sourcePackageURI}`}
              >
                <CloudArrowDownIcon className="h-3 w-3" />
                {isModifiedFromSource ? 'Forked' : 'Imported'}
              </span>
            ) : null}
          </div>

          {relDate ? (
            <span className="text-[11px] text-gray-400">{relDate}</span>
          ) : null}
        </div>
      </div>

      {rightHint ? (
        <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {rightHint}
        </div>
      ) : null}

      {children}
    </div>
  )
}
