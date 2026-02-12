import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { Cog6ToothIcon, QuestionMarkCircleIcon, ArrowRightStartOnRectangleIcon, ChevronLeftIcon, Bars3BottomLeftIcon, SparklesIcon, CloudArrowUpIcon, CheckCircleIcon, KeyIcon } from '@heroicons/react/24/solid'
import { Button } from '@/ui/shared/components/ui/button'

type MenuItem = {
  label: string
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  onClick?: () => void
  disabled?: boolean
}

function PopoverMenu({
  label,
  icon: Icon,
  items,
  align = 'right',
}: Readonly<{
  label: string
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  items: (MenuItem | 'divider')[]
  align?: 'left' | 'right'
}>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    globalThis.addEventListener('pointerdown', onPointerDown)
    return () => globalThis.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-[#2E2F2F]/60 transition-colors hover:bg-[#662F90]/8 hover:text-[#662F90] focus:outline-none focus:ring-2 focus:ring-[#662F90]/30"
      >
        {Icon ? <Icon className="h-4 w-4" aria-hidden={true} /> : null}
        <span className="sr-only">{label}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className={[
            'absolute z-40 mt-2 w-52 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          <div className="p-1">
            {items.map((it, idx) => {
              if (it === 'divider') return <div key={`d_${idx}`} className="my-1 h-px bg-black/10" />

              const ItemIcon = it.icon
              return (
                <button
                  key={it.label}
                  role="menuitem"
                  type="button"
                  disabled={it.disabled}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                    it.disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-800 hover:bg-slate-900/5',
                  ].join(' ')}
                  onClick={() => {
                    it.onClick?.()
                    setOpen(false)
                  }}
                >
                  {ItemIcon ? <ItemIcon className="h-4 w-4 text-slate-600" aria-hidden /> : null}
                  <span className="truncate">{it.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function initials(name?: string) {
  if (!name) return '👤'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const chars = parts.map((p) => p[0]?.toUpperCase()).filter(Boolean)
  return chars.length ? chars.join('') : '👤'
}

/** Avatar button that opens an account menu */
function AvatarMenu({
  userName,
  items,
}: Readonly<{
  userName?: string
  items: (MenuItem | 'divider')[]
}>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const avatarText = useMemo(() => initials(userName), [userName])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    globalThis.addEventListener('pointerdown', onPointerDown)
    return () => globalThis.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={userName ?? 'Account'}
        className="grid h-8 w-8 cursor-pointer select-none place-items-center rounded-full border border-[#2E2F2F]/15 bg-white/80 text-xs font-bold text-[#2E2F2F]/70 transition-all hover:border-[#662F90]/40 hover:bg-[#662F90]/10 hover:text-[#662F90] focus:outline-none focus:ring-2 focus:ring-[#662F90]/30"
      >
        {avatarText}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg"
        >
          <div className="p-1">
            {items.map((it, idx) => {
              if (it === 'divider') return <div key={`d_${idx}`} className="my-1 h-px bg-black/10" />

              const ItemIcon = it.icon
              return (
                <button
                  key={it.label}
                  role="menuitem"
                  type="button"
                  disabled={it.disabled}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                    it.disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-800 hover:bg-slate-900/5',
                  ].join(' ')}
                  onClick={() => {
                    it.onClick?.()
                    setOpen(false)
                  }}
                >
                  {ItemIcon ? <ItemIcon className="h-4 w-4 text-slate-600" aria-hidden /> : null}
                  <span className="truncate">{it.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export default function CanvasHeader({
  frameworkTitle,
  frameworkSubtitle,
  userName,
  tenantId,
  reserveRightForPanel,
  showSettings,
  isDirty,
  saveStatus = 'idle',
  saveError,
  onSave,
  onBack,
  onSignIn,
  onSignOut,
  onChangePassword,
  onOpenSettings,
  onResetHierarchy,
  onResetStar,
}: {
  frameworkTitle: string
  frameworkSubtitle?: string
  userName?: string
  tenantId?: string
  reserveRightForPanel?: boolean
  showSettings?: boolean
  /** Whether the editor has unsaved changes */
  isDirty?: boolean
  /** Current save status */
  saveStatus?: SaveStatus
  /** Error message if save failed */
  saveError?: string | null
  /** Called when the user clicks the Save button */
  onSave?: () => void
  onBack?: () => void
  onSignIn?: () => void
  onSignOut?: () => void
  /** Opens the change password dialog */
  onChangePassword?: () => void
  onOpenSettings?: () => void
  /** Re-layout graph in hierarchy mode (flat column below framework) */
  onResetHierarchy?: () => void
  /** Re-layout graph in star/radial topology mode */
  onResetStar?: () => void
}) {
  // Build user menu items
  const userMenuItems: (MenuItem | 'divider')[] = []
  
  // Show user name if signed in
  if (userName) {
    userMenuItems.push({ label: `Signed in as ${userName}`, disabled: true })
  } else {
    userMenuItems.push({ label: 'Not signed in', disabled: true })
  }
  
  userMenuItems.push('divider')

  // Change password
  if (userName && onChangePassword) {
    userMenuItems.push({
      label: 'Change password',
      icon: KeyIcon,
      onClick: onChangePassword,
    })
  }
  
  // Sign in/out action
  if (userName) {
    userMenuItems.push({ label: 'Sign out', icon: ArrowRightStartOnRectangleIcon, onClick: onSignOut, disabled: !onSignOut })
  } else {
    userMenuItems.push({ label: 'Sign in', icon: ArrowRightStartOnRectangleIcon, onClick: onSignIn, disabled: !onSignIn })
  }

  return (
    <div
      className="pointer-events-none absolute top-3 z-10"
      style={{
        left: 12,
        right: reserveRightForPanel ? 'calc(min(460px, 92vw) + 12px)' : 12,
      }}
    >
      <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              title="Back to Home"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-[#2E2F2F]/60 transition-colors hover:bg-[#662F90]/8 hover:text-[#662F90]"
            >
              <ChevronLeftIcon className="h-4 w-4" aria-hidden />
              Home
            </button>
          ) : null}

          <span className="font-[Outfit] text-base font-bold uppercase tracking-[0.06em] text-[#2E2F2F]">OpenCASE</span>

          <div className="h-5 w-px bg-gray-200" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-[#2E2F2F]">{frameworkTitle}</span>
            </div>
            {frameworkSubtitle ? <div className="truncate text-xs text-gray-500">{frameworkSubtitle}</div> : null}
          </div>

          {/* Save button / status indicator */}
          {onSave ? (
            <div className="flex items-center gap-2">
              {isDirty ? (
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={saveStatus === 'saving'}
                  title={saveError ?? undefined}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving…
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <CloudArrowUpIcon className="h-4 w-4" />
                      Retry
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 text-gray-400" title="All changes saved">
                  <CheckCircleIcon className="h-4 w-4" />
                </span>
              )}
              {saveStatus === 'error' && saveError ? (
                <span className="text-xs text-red-600" title={saveError}>
                  {saveError.length > 30 ? `${saveError.slice(0, 30)}…` : saveError}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {showSettings ? (
            <PopoverMenu
              label="Settings"
              icon={Cog6ToothIcon}
              items={[
                { label: 'Settings', icon: Cog6ToothIcon, onClick: onOpenSettings },
                { label: 'Hierarchy layout', icon: Bars3BottomLeftIcon, onClick: onResetHierarchy, disabled: !onResetHierarchy },
                { label: 'Star layout', icon: SparklesIcon, onClick: onResetStar, disabled: !onResetStar },
                'divider',
                { label: 'Help', icon: QuestionMarkCircleIcon, onClick: () => {} },
              ]}
            />
          ) : null}

          <AvatarMenu userName={userName} items={userMenuItems} />
        </div>
      </div>
    </div>
  )
}

