import { Button } from '@/ui/shared/components/ui/button'
import type { RemoteItemLink } from '@/ui/editor/remoteFramework/remoteFrameworkTypes'

type Props = {
  link: RemoteItemLink
  anchorRect: DOMRect | null
  onClose: () => void
  onRemove: () => void
}

export default function RemoteLinkPopover({ link, anchorRect, onClose, onRemove }: Readonly<Props>) {
  if (!anchorRect) return null

  const top = anchorRect.bottom + 8
  const left = Math.max(8, anchorRect.left)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed z-50 w-72 rounded-xl border border-black/10 bg-white p-3 shadow-xl"
        style={{ top, left }}
        role="dialog"
      >
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {link.remoteFrameworkTitle ?? 'Remote framework'}
        </div>
        <div className="mt-1 text-sm font-medium text-slate-900">
          {link.remoteHumanCodingScheme ? (
            <span className="font-mono text-xs text-slate-600">{link.remoteHumanCodingScheme}</span>
          ) : null}
          {link.remoteHumanCodingScheme && link.remoteLabel ? ' — ' : null}
          {link.remoteLabel}
        </div>
        <div className="mt-1 text-xs text-slate-500">Type: {link.associationType}</div>
        <Button type="button" variant="destructive" size="sm" className="mt-3 w-full" onClick={onRemove}>
          Remove link
        </Button>
      </div>
    </>
  )
}
