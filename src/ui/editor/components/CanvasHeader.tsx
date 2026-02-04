import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { Cog6ToothIcon, QuestionMarkCircleIcon, ArrowRightOnRectangleIcon, UserCircleIcon, ChevronLeftIcon } from '@heroicons/react/24/solid'
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
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
      >
        {Icon ? <Icon className="h-4 w-4" aria-hidden={true} /> : null}
        <span className="sr-only">{label}</span>
      </Button>

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

export default function CanvasHeader({
  frameworkTitle,
  frameworkSubtitle,
  userName,
  reserveRightForPanel,
  onBack,
  onSignIn,
  onSignOut,
  onOpenSettings,
}: {
  frameworkTitle: string
  frameworkSubtitle?: string
  userName?: string
  reserveRightForPanel?: boolean
  onBack?: () => void
  onSignIn?: () => void
  onSignOut?: () => void
  onOpenSettings?: () => void
}) {
  const avatarText = useMemo(() => initials(userName), [userName])

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
            <Button variant="ghost" size="sm" onClick={onBack} title="Back to Home">
              <ChevronLeftIcon className="h-4 w-4" aria-hidden />
              Home
            </Button>
          ) : null}

          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-extrabold tracking-tight text-white">
            CASE
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{frameworkTitle}</div>
            {frameworkSubtitle ? <div className="truncate text-xs text-slate-600">{frameworkSubtitle}</div> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PopoverMenu
            label="Settings"
            icon={Cog6ToothIcon}
            items={[
              { label: 'Settings', icon: Cog6ToothIcon, onClick: onOpenSettings },
              { label: 'Help', icon: QuestionMarkCircleIcon, onClick: () => {} },
            ]}
          />

          <PopoverMenu
            label="Account"
            icon={UserCircleIcon}
            items={[
              { label: userName ? `Signed in as ${userName}` : 'Not signed in', disabled: true },
              'divider',
              userName
                ? { label: 'Sign out', icon: ArrowRightOnRectangleIcon, onClick: onSignOut, disabled: !onSignOut }
                : { label: 'Sign in', icon: ArrowRightOnRectangleIcon, onClick: onSignIn, disabled: !onSignIn },
            ]}
          />

          <div
            className="ml-1 grid h-9 w-9 select-none place-items-center rounded-full border border-black/10 bg-white text-xs font-bold text-slate-700"
            title={userName ?? 'Account'}
            aria-hidden="true"
          >
            {avatarText}
          </div>
        </div>
      </div>
    </div>
  )
}

