import { Plus } from 'lucide-react'
import { Button } from '@/ui/shared/components/ui/button'
import FrameworkTreeItem from './FrameworkTreeItem'
import type { FrameworkTreeNode } from '@/domain/framework/treeDerivation'

type Props = {
  title: string
  description?: string
  publisher?: string
  frameworkNodeId: string | null
  roots: FrameworkTreeNode[]
  selectedId: string | null
  expandedIds: Set<string>
  onToggleExpand: (_id: string) => void
  /** When true, suppresses the title/description header button — used when the caller renders its own header (e.g. an accordion). */
  noHeader?: boolean
  /** Optional extra content rendered inside the header (e.g. a framework selector dropdown) */
  headerSlot?: React.ReactNode
  onSelect?: (_id: string) => void
  onAddChild?: (_parentId: string) => void
  onAddRoot?: () => void
  /** Drag source — all items become draggable */
  isDraggable?: boolean
  onDragStart?: (_id: string, _e: React.DragEvent) => void
  /** Drop target — all items accept drops */
  isDropTarget?: boolean
  onDragOver?: (_id: string, _e: React.DragEvent) => void
  onDragLeave?: (_id: string, _e: React.DragEvent) => void
  onDrop?: (_id: string, _e: React.DragEvent) => void
  /** Currently-hovered item ID (for drop highlight) */
  dragOverItemId?: string | null
  /** Pending association counts per item ID */
  associationCounts?: Map<string, number>
  /** Called when an association-count badge is clicked */
  onBadgeClick?: (_id: string, _e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function FrameworkTreeList({
  title,
  description,
  publisher,
  frameworkNodeId,
  roots,
  selectedId,
  expandedIds,
  onToggleExpand,
  noHeader,
  headerSlot,
  onSelect,
  onAddChild,
  onAddRoot,
  isDraggable,
  onDragStart,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverItemId,
  associationCounts,
  onBadgeClick,
}: Readonly<Props>) {
  const frameworkSelected = frameworkNodeId !== null && selectedId === frameworkNodeId

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {!noHeader && <button
        type="button"
        onClick={() => frameworkNodeId && onSelect?.(frameworkNodeId)}
        className={[
          'flex shrink-0 w-full items-start justify-between gap-2 border-b px-4 py-3 text-left transition-colors',
          frameworkSelected
            ? 'border-teal-400 bg-teal-50'
            : 'border-black/10 bg-blue-50 hover:bg-blue-100',
        ].join(' ')}
        title={onSelect ? 'Select framework to edit its properties' : undefined}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {title}
          </p>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">
              {description}
            </p>
          ) : null}
          {publisher ? (
            <p className="mt-0.5 text-xs text-slate-400">
              {publisher}
            </p>
          ) : null}
          {headerSlot ? (
            <div className="mt-2" onClick={(e) => e.stopPropagation()} role="presentation">
              {headerSlot}
            </div>
          ) : null}
        </div>
      </button>}

      <div className="flex-1 overflow-y-auto p-3" data-scroll-container role="tree" aria-label="Framework items">
        {roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-slate-400">
            <p>No items yet.</p>
            {onAddRoot && (
              <Button size="sm" variant="outline" onClick={onAddRoot}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add first item
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {roots.map((node) => (
              <FrameworkTreeItem
                key={node.id}
                node={node}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                onAddChild={onAddChild}
                isDraggable={isDraggable}
                onDragStart={onDragStart}
                isDropTarget={isDropTarget}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                dragOverItemId={dragOverItemId}
                associationCounts={associationCounts}
                onBadgeClick={onBadgeClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
