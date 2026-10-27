import { CloudArrowDownIcon } from '@heroicons/react/24/solid'
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

type Props = {
  /** Raw CFDocument adoptionStatus — legacy values are normalized, unrecognized ones shown as-is */
  adoptionStatus?: string
  /** Read-only cached remote framework (CGE cache) */
  readOnly?: boolean
  /** CASE API readable without signing in */
  publicAccess?: boolean
  /** URL the framework was imported from, if known — shown in the Mirrored/Forked badge tooltip */
  sourcePackageURI?: string
  /** Set (true or false) once a framework has been imported/mirrored; true once it's been locally modified (forked) */
  isModifiedFromSource?: boolean
  className?: string
}

/**
 * Framework status badges (adoption status, Read-only, Public, Mirrored/Forked),
 * shared by the home screen's framework cards and the editor header.
 */
export function FrameworkLabels({
  adoptionStatus: rawAdoptionStatus,
  readOnly,
  publicAccess,
  sourcePackageURI,
  isModifiedFromSource,
  className,
}: Readonly<Props>) {
  const adoptionStatus = normalizeAdoptionStatus(rawAdoptionStatus) ?? rawAdoptionStatus
  const statusInfo = adoptionStatus ? STATUS_STYLE[adoptionStatus] : undefined

  return (
    <div className={cn('flex items-center gap-2', className)}>
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
      {readOnly ? (
        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Read-only
        </span>
      ) : null}
      {publicAccess ? (
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800" title="Anyone can read this framework without signing in">
          Public
        </span>
      ) : null}
      {isModifiedFromSource !== undefined ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            isModifiedFromSource
              ? 'bg-violet-100 text-violet-700'
              : 'bg-sky-100 text-sky-700',
          )}
          title={
            isModifiedFromSource
              ? sourcePackageURI ? `Forked — originally mirrored from ${sourcePackageURI}` : 'Forked — originally mirrored, now locally modified'
              : sourcePackageURI ? `Mirrored from ${sourcePackageURI}` : 'Mirrored — kept in sync with its imported source'
          }
        >
          <CloudArrowDownIcon className="h-3 w-3" />
          {isModifiedFromSource ? 'Forked' : 'Mirrored'}
        </span>
      ) : null}
    </div>
  )
}
