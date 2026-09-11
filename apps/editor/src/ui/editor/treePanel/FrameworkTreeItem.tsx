import { useState } from 'react'
import { ChevronDown, ChevronRight, Link, Plus } from 'lucide-react'
import type { FrameworkTreeNode } from '@/domain/framework/treeDerivation'

type Props = {
  node: FrameworkTreeNode
  selectedId: string | null
  expandedIds: Set<string>
  onToggleExpand: (_id: string) => void
  onSelect?: (_id: string) => void
  onAddChild?: (_parentId: string) => void
  isDraggable?: boolean
  onDragStart?: (_id: string, _e: React.DragEvent) => void
  isDropTarget?: boolean
  onDragOver?: (_id: string, _e: React.DragEvent) => void
  onDragLeave?: (_id: string, _e: React.DragEvent) => void
  onDrop?: (_id: string, _e: React.DragEvent) => void
  /** Threaded through children — each item derives its own isDraggedOver / associationCount */
  dragOverItemId?: string | null
  associationCounts?: Map<string, number>
  /** Called when the association-count badge is clicked */
  onBadgeClick?: (_id: string, _e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function FrameworkTreeItem({
  node,
  selectedId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onAddChild,
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
  const [hovered, setHovered] = useState(false)
  const isSelected = selectedId === node.id
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0
  const isDraggedOver = dragOverItemId === node.id
  const associationCount = associationCounts?.get(node.id) ?? 0

  const rowClass = [
    'flex w-full items-start gap-2 rounded-lg border px-3 py-2 transition-colors',
    isDraggedOver
      ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-400/40'
      : isSelected
        ? 'border-teal-400 bg-teal-50'
        : 'border-black/15 bg-white hover:bg-slate-50 hover:border-black/25',
    isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
    isDropTarget ? 'cursor-copy' : '',
  ].join(' ')

  return (
    <div>
      <div
        data-item-id={node.id}
        className={rowClass}
        draggable={isDraggable}
        onClick={() => onSelect?.(node.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDragStart={(e) => {
          if (!isDraggable) return
          e.dataTransfer.setData('text/plain', node.id)
          e.dataTransfer.effectAllowed = 'link'
          onDragStart?.(node.id, e)
        }}
        onDragOver={(e) => {
          if (!isDropTarget) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'link'
          onDragOver?.(node.id, e)
        }}
        onDragLeave={(e) => {
          if (!isDropTarget) return
          onDragLeave?.(node.id, e)
        }}
        onDrop={(e) => {
          if (!isDropTarget) return
          e.preventDefault()
          onDrop?.(node.id, e)
        }}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(node.id) }
          if (e.key === 'ArrowRight' && hasChildren && !isExpanded) onToggleExpand(node.id)
          if (e.key === 'ArrowLeft' && isExpanded) onToggleExpand(node.id)
        }}
      >
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id) }}
          tabIndex={-1}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {node.cfItem.humanCodingScheme ? (
              <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-700">
                {node.cfItem.humanCodingScheme}
              </span>
            ) : null}
            <span className="text-[11px] text-slate-400 leading-snug">
              {node.cfItem.identifier}
            </span>
            {associationCount > 0 && (
              <button
                type="button"
                className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 hover:bg-purple-200 transition-colors focus:outline-none focus:ring-1 focus:ring-purple-400"
                title={`${associationCount} pending association${associationCount !== 1 ? 's' : ''} — click to manage`}
                onClick={(e) => { e.stopPropagation(); onBadgeClick?.(node.id, e) }}
                tabIndex={-1}
              >
                <Link className="h-2.5 w-2.5" />
                {associationCount}
              </button>
            )}
          </div>
          {node.cfItem.abbreviatedStatement?.trim() ? (
            <p className="mt-1 text-xs leading-snug text-slate-600">
              {node.cfItem.abbreviatedStatement.trim()}
            </p>
          ) : null}
          <p className="mt-0.5 text-sm leading-snug text-slate-800 break-words">
            {node.cfItem.fullStatement}
          </p>
          {hasChildren && (
            <span className="mt-0.5 block text-xs text-slate-400">
              {node.children.length} {node.children.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {onAddChild && (
          <button
            type="button"
            className={[
              'mt-0.5 shrink-0 rounded p-1 text-slate-400 transition-opacity hover:bg-[#662F90]/10 hover:text-[#662F90] focus:outline-none focus:ring-1 focus:ring-[#662F90]/30',
              hovered || isSelected ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id) }}
            title="Add child item"
            tabIndex={-1}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-5 mt-1 space-y-1" role="group">
          {node.children.map((child) => (
            <FrameworkTreeItem
              key={child.id}
              node={child}
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
  )
}
