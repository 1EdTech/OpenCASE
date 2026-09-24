import * as React from 'react'
import { cn } from '@/lib/utils'

export type ComboboxOption = {
  value: string
  label: string
  description?: string
}

export type ComboboxInputProps = Readonly<{
  /** Current value */
  value: string
  /** Called when the value changes (from selection or typing) */
  onChange: (value: string) => void
  /** Called when the user commits a value (blur or option select). Use for side-effects like auto-creating definitions. */
  onCommit?: (value: string) => void
  /** Predefined options to show in the dropdown */
  options: readonly ComboboxOption[]
  /** Placeholder text when empty */
  placeholder?: string
  /** HTML id for the input element */
  id?: string
  /** Additional CSS classes on the wrapper */
  className?: string
}>

const LISTBOX_ID_SUFFIX = '-listbox'

/**
 * A combobox-style input that shows a dropdown of predefined options
 * but also allows the user to type custom text.
 *
 * - Clicking the input or the chevron opens the dropdown
 * - Selecting an option fills the input
 * - The user can always clear the selection and type freely
 * - Clicking outside or pressing Escape closes the dropdown
 */
export function ComboboxInput({ value, onChange, onCommit, options, placeholder, id, className }: ComboboxInputProps) {
  const [open, setOpen] = React.useState(false)
  const [highlightIdx, setHighlightIdx] = React.useState(-1)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listboxRef = React.useRef<HTMLDivElement>(null)

  const listboxId = id ? `${id}${LISTBOX_ID_SUFFIX}` : undefined

  const MAX_VISIBLE = 5

  // Filter options by case-insensitive substring match on the current value, capped to MAX_VISIBLE
  const { filtered, totalCount } = React.useMemo(() => {
    const q = value.trim().toLowerCase()
    const all = !q
      ? (options as ComboboxOption[])
      : (options as ComboboxOption[]).filter(
          (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
        )
    return { filtered: all.slice(0, MAX_VISIBLE), totalCount: all.length }
  }, [options, value])

  const isMatch = options.some((o) => o.value === value)
  const hasMore = totalCount > MAX_VISIBLE

  // Close when clicking outside
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (!open || highlightIdx < 0 || !listboxRef.current) return
    const el = listboxRef.current.children[highlightIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx, open])

  // Reset highlight when the filtered list changes
  React.useEffect(() => {
    setHighlightIdx(-1)
  }, [filtered.length])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlightIdx(0)
      } else {
        setHighlightIdx((prev) => (prev + 1) % filtered.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (open) {
        setHighlightIdx((prev) => (prev - 1 + filtered.length) % filtered.length)
      }
    } else if (e.key === 'Enter' && open && highlightIdx >= 0) {
      e.preventDefault()
      const opt = filtered[highlightIdx]
      if (opt) {
        onChange(opt.value)
        onCommit?.(opt.value)
        setOpen(false)
        setHighlightIdx(-1)
      }
    } else if (e.key === 'Enter' && !open && value.trim()) {
      // Commit free-text on Enter when dropdown is closed
      onCommit?.(value)
    }
  }

  const selectOption = (opt: ComboboxOption) => {
    onChange(opt.value)
    onCommit?.(opt.value)
    setOpen(false)
    setHighlightIdx(-1)
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Fire onCommit when the user leaves the field (unless they clicked a dropdown option,
            // which already called onCommit via selectOption and prevented blur).
            if (value.trim()) onCommit?.(value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background py-1 pl-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            value.trim() ? 'pr-14' : 'pr-8',
          )}
        />
        {/* Clear button — visible when a value is set */}
        {value.trim() && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear value"
            onClick={() => {
              onChange('')
              onCommit?.('')
              setOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute inset-y-0 right-7 flex w-7 items-center justify-center text-slate-300 hover:text-slate-500"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle options"
          onClick={() => {
            setOpen((prev) => !prev)
            inputRef.current?.focus()
          }}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-slate-400 hover:text-slate-600"
        >
          <svg className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (filtered.length > 0 || (!isMatch && value.trim())) && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[280px] w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-sm"
        >
          {filtered.map((opt, idx) => {
            const selected = opt.value === value
            const highlighted = idx === highlightIdx
            return (
              <div
                key={`${idx}-${opt.value}`}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onMouseEnter={() => setHighlightIdx(idx)}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent blur
                  selectOption(opt)
                }}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  highlighted && 'bg-violet-50',
                  selected && 'font-medium text-violet-700',
                  !selected && !highlighted && 'text-slate-700',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{opt.label}</span>
                  {selected && (
                    <svg className="h-4 w-4 shrink-0 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {opt.description && (
                  <div className="mt-0.5 text-xs leading-snug text-slate-500">{opt.description}</div>
                )}
              </div>
            )
          })}
          {/* Footer hints */}
          <div className="border-t border-slate-100 px-3 py-1.5 text-[11px] leading-relaxed text-slate-400">
            {!isMatch && value.trim() ? (
              <span>Create &ldquo;{value}&rdquo;</span>
            ) : hasMore ? (
              <span>Type to search {totalCount - MAX_VISIBLE} more…</span>
            ) : (
              <span>Type to search or create new</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
