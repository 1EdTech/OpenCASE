import { useState, useCallback } from 'react'
import { Input } from '@/ui/shared/components/ui/input'

/** Curated palette of 10 colors for visual grouping */
const PRESET_COLORS = [
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#a855f7', label: 'Purple' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#64748b', label: 'Slate' },
] as const

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

type Props = {
  value: string | undefined
  onChange: (color: string | undefined) => void
  /** Label displayed above the picker. Defaults to "Color band" */
  label?: string
}

export default function ColorBandPicker({ value, onChange, label = 'Color band' }: Readonly<Props>) {
  const [hexInput, setHexInput] = useState(value ?? '')

  const handlePresetClick = useCallback(
    (hex: string) => {
      if (value === hex) {
        // Clicking the already-selected preset clears it
        onChange(undefined)
        setHexInput('')
      } else {
        onChange(hex)
        setHexInput(hex)
      }
    },
    [value, onChange],
  )

  const handleClear = useCallback(() => {
    onChange(undefined)
    setHexInput('')
  }, [onChange])

  const handleHexChange = useCallback(
    (raw: string) => {
      // Ensure it starts with #
      const normalized = raw.startsWith('#') ? raw : `#${raw}`
      setHexInput(normalized)
      if (HEX_PATTERN.test(normalized)) {
        onChange(normalized.toLowerCase())
      }
    },
    [onChange],
  )

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-700">{label}</label>

      {/* Preset palette */}
      <div className="flex flex-wrap gap-1.5">
        {/* Clear / none swatch */}
        <button
          type="button"
          title="None (clear)"
          onClick={handleClear}
          className={[
            'relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all',
            !value
              ? 'border-slate-400 ring-2 ring-slate-400/30'
              : 'border-slate-200 hover:border-slate-400',
          ].join(' ')}
        >
          {/* Diagonal line to indicate "none" */}
          <div className="absolute h-5 w-0.5 rotate-45 rounded-full bg-slate-400" />
        </button>

        {PRESET_COLORS.map(({ hex, label: colorLabel }) => (
          <button
            key={hex}
            type="button"
            title={colorLabel}
            onClick={() => handlePresetClick(hex)}
            className={[
              'h-7 w-7 rounded-full border-2 transition-all',
              value === hex
                ? 'border-slate-800 ring-2 ring-slate-800/20 scale-110'
                : 'border-transparent hover:scale-110 hover:border-white hover:shadow-md',
            ].join(' ')}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 shrink-0 rounded-md border border-slate-200"
          style={{
            backgroundColor: value ?? 'transparent',
            backgroundImage: !value
              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)'
              : undefined,
            backgroundSize: !value ? '8px 8px' : undefined,
            backgroundPosition: !value ? '0 0, 4px 4px' : undefined,
          }}
        />
        <Input
          type="text"
          placeholder="#000000"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          maxLength={7}
          className="h-7 flex-1 font-mono text-xs"
        />
      </div>
    </div>
  )
}
