import { useEffect, useMemo, useRef, useState } from 'react'
import { PlusIcon, DocumentPlusIcon, LinkIcon } from '@heroicons/react/24/solid'

type AddOption = {
  id: string
  label: string
  description: string
  icon: typeof PlusIcon
  shortcut: string
}

/** Detect if running on Mac for keyboard shortcut display */
const isMac = typeof globalThis.navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(globalThis.navigator.platform)

const getAddOptions = (): AddOption[] => [
  {
    id: 'item',
    label: 'Add Item',
    description: 'Create a new detached CASE item',
    icon: DocumentPlusIcon,
    shortcut: isMac ? '⌘C' : 'Ctrl+C',
  },
  {
    id: 'external',
    label: 'Add External Framework',
    description: 'Reference an external framework',
    icon: LinkIcon,
    shortcut: isMac ? '⌘F' : 'Ctrl+F',
  },
]

type Props = {
  onAddItem: () => void
  onAddExternalFramework: () => void
  /** Whether the side panel is open - shifts the button left */
  sidePanelOpen?: boolean
}

export default function FloatingAddButton({ onAddItem, onAddExternalFramework, sidePanelOpen }: Readonly<Props>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const addOptions = useMemo(() => getAddOptions(), [])

  // Close menu when clicking outside
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    globalThis.addEventListener('pointerdown', onPointerDown)
    return () => globalThis.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleSelect = (optionId: string) => {
    setOpen(false)
    if (optionId === 'item') {
      onAddItem()
    } else if (optionId === 'external') {
      onAddExternalFramework()
    }
  }

  // Calculate right position based on side panel state
  const rightPosition = sidePanelOpen ? 'calc(min(460px, 92vw) + 24px)' : '24px'

  return (
    <div 
      ref={rootRef} 
      className="fixed bottom-6 z-30 transition-all duration-200 ease-out"
      style={{ right: rightPosition }}
    >
      {/* Menu */}
      {open && (
        <div className="absolute bottom-16 right-0 mb-2 w-72 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
          <div className="p-1">
            {addOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                  onClick={() => handleSelect(option.id)}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">{option.label}</span>
                      <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {option.shortcut}
                      </kbd>
                    </div>
                    <div className="text-xs text-slate-500">{option.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all',
          'bg-gradient-to-br from-violet-600 to-indigo-600 text-white',
          'hover:from-violet-500 hover:to-indigo-500 hover:shadow-xl',
          'focus:outline-none focus:ring-4 focus:ring-violet-500/30',
          open ? 'rotate-45' : '',
        ].join(' ')}
        aria-label="Add new element"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <PlusIcon className="h-6 w-6 transition-transform" />
      </button>
    </div>
  )
}
