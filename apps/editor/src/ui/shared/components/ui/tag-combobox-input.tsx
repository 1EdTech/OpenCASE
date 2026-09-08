import * as React from 'react'
import { cn } from '@/lib/utils'

export type TagComboboxOption = {
  value: string
  label: string
  description?: string
}

export type TagComboboxInputProps = Readonly<{
  /** Current values (the tag list) */
  values: string[]
  /** Called when the tag list changes (add or remove) */
  onChange: (values: string[]) => void
  /** Called when a new value is committed (selected or typed). Use for side-effects like auto-creating definitions. */
  onCommit?: (addedValue: string) => void
  /** Predefined options to show in the dropdown */
  options: readonly TagComboboxOption[]
  /** Placeholder text when input is empty */
  placeholder?: string
  /** HTML id for the input element */
  id?: string
  /** Additional CSS classes on the wrapper */
  className?: string
  /** CSS class for individual tag chips. Defaults to violet pill style. */
  tagClassName?: string
}>

const LISTBOX_ID_SUFFIX = '-listbox'

/**
 * A multi-value combobox that displays selected values as removable tags
 * and provides a searchable dropdown for adding more.
 *
 * - Current values are shown as tag chips with "x" buttons
 * - The input filters the dropdown list as the user types
 * - Selecting an option or pressing Enter adds a tag
 * - Options already selected are hidden from the dropdown
 * - Typing a new value auto-creates it on commit
 */
export function TagComboboxInput({
  values,
  onChange,
  onCommit,
  options,
  placeholder,
  id,
  className,
  tagClassName,
}: TagComboboxInputProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [highlightIdx, setHighlightIdx] = React.useState(-1)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listboxRef = React.useRef<HTMLDivElement>(null)

  const listboxId = id ? `${id}${LISTBOX_ID_SUFFIX}` : undefined

  // Set of current values for quick lookup
  const valuesSet = React.useMemo(() => new Set(values), [values])

  const MAX_VISIBLE = 5

  // Filter options: exclude already-selected, match by case-insensitive substring, cap to MAX_VISIBLE
  const { filtered, totalCount } = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = (options as TagComboboxOption[]).filter((o) => {
      if (valuesSet.has(o.value)) return false
      if (!q) return true
      return o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    })
    return { filtered: all.slice(0, MAX_VISIBLE), totalCount: all.length }
  }, [options, query, valuesSet])

  const isExactMatch = options.some((o) => o.value.toLowerCase() === query.trim().toLowerCase())
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

  const addValue = React.useCallback(
    (val: string) => {
      const trimmed = val.trim()
      if (!trimmed) return
      if (valuesSet.has(trimmed)) return
      onChange([...values, trimmed])
      onCommit?.(trimmed)
      setQuery('')
      setOpen(false)
      setHighlightIdx(-1)
    },
    [values, valuesSet, onChange, onCommit],
  )

  const removeValue = React.useCallback(
    (val: string) => {
      onChange(values.filter((v) => v !== val))
    },
    [values, onChange],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Backspace' && !query && values.length > 0) {
      // Remove last tag when backspace is pressed with empty input
      removeValue(values[values.length - 1])
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
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && highlightIdx >= 0 && filtered[highlightIdx]) {
        addValue(filtered[highlightIdx].value)
      } else if (query.trim()) {
        addValue(query)
      }
    }
  }

  const selectOption = (opt: TagComboboxOption) => {
    addValue(opt.value)
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {/* Tags + input area */}
      <div
        className="flex min-h-[36px] flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 shadow-xs transition-colors focus-within:ring-[3px] focus-within:ring-ring/50"
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v) => (
          <span
            key={v}
            className={tagClassName ?? 'inline-flex items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700'}
          >
            {v}
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation()
                removeValue(v)
              }}
              className="ml-0.5 rounded-full p-0.5 text-violet-400 hover:bg-violet-100 hover:text-violet-600"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Auto-add typed text on blur
            if (query.trim()) addValue(query)
          }}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : undefined}
          className="min-w-[80px] flex-1 border-0 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {/* Clear all button — visible when values exist */}
        {values.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear all"
            onClick={(e) => {
              e.stopPropagation()
              onChange([])
              setQuery('')
              setOpen(false)
              inputRef.current?.focus()
            }}
            className="flex shrink-0 items-center justify-center text-slate-300 hover:text-slate-500"
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
          className="flex shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
        >
          <svg
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {open && (filtered.length > 0 || (!isExactMatch && query.trim())) && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[280px] w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-sm"
        >
          {filtered.map((opt, idx) => {
            const highlighted = idx === highlightIdx
            return (
              <div
                key={`${idx}-${opt.value}`}
                role="option"
                aria-selected={false}
                tabIndex={-1}
                onMouseEnter={() => setHighlightIdx(idx)}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent blur
                  selectOption(opt)
                }}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  highlighted && 'bg-violet-50',
                  !highlighted && 'text-slate-700',
                )}
              >
                <span>{opt.label}</span>
                {opt.description && (
                  <div className="mt-0.5 text-xs leading-snug text-slate-500">{opt.description}</div>
                )}
              </div>
            )
          })}
          {/* Footer hints */}
          <div className="border-t border-slate-100 px-3 py-1.5 text-[11px] leading-relaxed text-slate-400">
            {!isExactMatch && query.trim() ? (
              <span>Press Enter to add &ldquo;{query.trim()}&rdquo;</span>
            ) : hasMore ? (
              <span>Type to search {totalCount - MAX_VISIBLE} more…</span>
            ) : (
              <span>Type to search or add new</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
