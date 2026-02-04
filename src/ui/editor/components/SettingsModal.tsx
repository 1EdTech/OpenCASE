import { useEffect, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { Label } from '@/ui/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/ui/shared/components/ui/radio-group'
import { XMarkIcon } from '@heroicons/react/24/solid'

export type EdgeType = 'default' | 'straight' | 'step' | 'smoothstep' | 'simplebezier'

export type EditorSettings = {
  edgeType: EdgeType
}

const EDGE_TYPE_OPTIONS: { value: EdgeType; label: string; description: string }[] = [
  { value: 'default', label: 'Bezier (Default)', description: 'Smooth curved lines' },
  { value: 'smoothstep', label: 'Smooth Step', description: 'Rounded right-angle corners' },
  { value: 'step', label: 'Step', description: 'Sharp right-angle corners' },
  { value: 'straight', label: 'Straight', description: 'Direct straight lines' },
  { value: 'simplebezier', label: 'Simple Bezier', description: 'Simpler curved lines' },
]

type Props = {
  open: boolean
  settings: EditorSettings
  onClose: () => void
  onSave: (settings: EditorSettings) => void
}

export default function SettingsModal({ open, settings, onClose, onSave }: Readonly<Props>) {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings)

  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalSettings(settings)
    }
  }, [open, settings])

  // Handle escape key
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const handleSave = () => {
    onSave(localSettings)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-black/10 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 id="settings-title" className="text-lg font-semibold text-slate-900">
            Editor Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close settings"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="space-y-5">
            {/* Edge Type Setting */}
            <div>
              <div className="mb-3">
                <Label className="text-sm font-semibold text-slate-900">Edge Style</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose how connection lines are drawn between nodes
                </p>
              </div>
              
              <RadioGroup
                value={localSettings.edgeType}
                onValueChange={(value) => setLocalSettings({ ...localSettings, edgeType: value as EdgeType })}
                className="space-y-2"
              >
                {EDGE_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={[
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                      localSettings.edgeType === option.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <RadioGroupItem value={option.value} id={`edge-type-${option.value}`} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">{option.label}</div>
                      <div className="text-xs text-slate-500">{option.description}</div>
                    </div>
                    {/* Visual preview */}
                    <EdgePreview type={option.value} />
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-black/10 px-5 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Small SVG preview of each edge type */
function EdgePreview({ type }: { type: EdgeType }) {
  const width = 48
  const height = 32
  
  let path: string
  switch (type) {
    case 'straight':
      path = 'M 4 28 L 44 4'
      break
    case 'step':
      path = 'M 4 28 L 4 16 L 44 16 L 44 4'
      break
    case 'smoothstep':
      path = 'M 4 28 L 4 20 Q 4 16 8 16 L 40 16 Q 44 16 44 12 L 44 4'
      break
    case 'simplebezier':
      path = 'M 4 28 Q 24 28 24 16 Q 24 4 44 4'
      break
    case 'default':
    default:
      path = 'M 4 28 C 4 16 44 16 44 4'
      break
  }

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      className="flex-shrink-0"
    >
      <path
        d={path}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Start dot */}
      <circle cx={4} cy={28} r={3} fill="#94a3b8" />
      {/* End dot */}
      <circle cx={44} cy={4} r={3} fill="#94a3b8" />
    </svg>
  )
}
