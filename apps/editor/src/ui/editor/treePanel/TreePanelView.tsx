import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Plus, X } from 'lucide-react'
import { useEditor } from '@/ui/editor/state/EditorContext'
import { buildFrameworkTree, type FrameworkEdgeRecord, type FrameworkTreeNode } from '@/domain/framework/treeDerivation'
import type { CFItem } from '@/domain/case/types'
import type { HomeFramework } from '@/ui/home/frameworkStore'
import type { Framework } from '@/domain/framework/model/types'
import FrameworkTreeList from './FrameworkTreeList'

// ── Types ─────────────────────────────────────────────────────────────────

type PendingAssociation = {
  id: string
  fromItemId: string
  toItemId: string
  toFrameworkId: string
  associationType: string
  /** Canonical URI of the origin item — preserved for correct serialization when external frameworks are involved */
  originUri: string
  /** Canonical URI of the destination item — preserved for correct serialization when external frameworks are involved */
  destinationUri: string
}

const ALIGNMENT_ASSOCIATION_TYPES: Array<{ value: string; label: string }> = [
  { value: 'exactMatchOf', label: 'Exact Match Of' },
  { value: 'isRelatedTo', label: 'Is Related To' },
  { value: 'isPeerOf', label: 'Is Peer Of' },
  { value: 'precedes', label: 'Precedes' },
  { value: 'isReplacedBy', label: 'Is Replaced By' },
]

type LineCoord = {
  id: string
  d: string
  midX: number
  midY: number
  /** True when one or both endpoints are ancestors (item is collapsed). Clicking expands to reveal items. */
  isDashed: boolean
}

type PopoverState = {
  itemId: string
  side: 'left' | 'right'
  x: number
  y: number
}

type AlignmentPreload = {
  docId: string
  associations: Array<{
    id: string
    fromItemId: string
    toItemId: string
    toFrameworkId: string
    associationType: string
    originUri: string
    destinationUri: string
  }>
}

type TargetEntry = {
  id: string
  alignmentDocId: string
  hasUnsavedChanges: boolean
}

type Props = {
  availableFrameworks?: HomeFramework[]
  /** Server-side frameworks not yet loaded locally — shown in the target selector and auto-loaded when selected */
  serverFrameworks?: Array<{ id: string; title: string }>
  /** Load a framework from the server into the local session (called when a server-only target is selected) */
  onLoadTargetFramework?: (id: string) => Promise<void>
  /** Whether the source (left-panel) framework has been saved to the server. Alignment authoring requires stable server-assigned URIs. */
  isSourcePublished?: boolean
  /** Called with a serialized alignment CFPackage when the user saves pending associations. */
  onSaveAlignments?: (cfPackage: unknown) => Promise<void>
  /** Called when the user expands a target framework — returns any previously-saved alignment doc ID and associations for that pairing. */
  onLoadAlignmentsForTarget?: (targetId: string) => Promise<AlignmentPreload>
  /** Called once on mount to discover all frameworks that already have saved alignments with the source. Used to pre-populate the target list. */
  onDiscoverAlignedTargets?: (sourceId: string) => Promise<Array<{ targetId: string; alignmentDocId: string }>>
}

// ── Helpers: build tree data from a domain Framework ──────────────────────

function domainFrameworkToCfItems(framework: Framework): CFItem[] {
  return [...framework.items.values()].map((item) => {
    const md = (item.metadata ?? {}) as Record<string, unknown>
    return {
      identifier: String(item.id),
      uri: (md.caseUri as string) || `urn:case:item:${String(item.id)}`,
      fullStatement: item.statement,
      humanCodingScheme: md.humanCodingScheme as string | undefined,
      abbreviatedStatement: md.abbreviatedStatement as string | undefined,
      lastChangeDateTime: (md.lastChangeDateTime as string) || new Date().toISOString(),
    }
  })
}

function domainFrameworkToEdges(framework: Framework): FrameworkEdgeRecord[] {
  const frameworkId = String(framework.id)
  return [...framework.associations.values()]
    .filter(
      (a) =>
        (a.associationType === 'isChildOf' || a.associationType === 'isPartOf') &&
        String(a.toItemId) !== frameworkId,
    )
    .map((a) => {
      const md = (a.metadata ?? {}) as Record<string, unknown>
      return {
        parentId: String(a.toItemId),
        childId: String(a.fromItemId),
        sequenceNumber: md.sequenceNumber as number | undefined,
      }
    })
}

function domainFrameworkToRootIds(framework: Framework): string[] {
  const frameworkId = String(framework.id)
  return [...framework.associations.values()]
    .filter(
      (a) =>
        a.associationType === 'isChildOf' && String(a.toItemId) === frameworkId,
    )
    .sort((a, b) => {
      const seqA = ((a.metadata ?? {}) as Record<string, unknown>).sequenceNumber as number ?? Infinity
      const seqB = ((b.metadata ?? {}) as Record<string, unknown>).sequenceNumber as number ?? Infinity
      return seqA - seqB
    })
    .map((a) => String(a.fromItemId))
}

/** Returns all ancestor IDs of itemId, from immediate parent up to the root, in that order. */
function ancestorsFromParentMap(itemId: string, parentMap: Map<string, string | null>): string[] {
  const ancestors: string[] = []
  let current = parentMap.get(itemId)
  while (current !== undefined && current !== null) {
    ancestors.push(current)
    current = parentMap.get(current)
  }
  return ancestors
}

/** Maps every item ID → its parent item ID (null for root items). */
function buildParentMap(nodes: FrameworkTreeNode[], parentId: string | null = null, map = new Map<string, string | null>()): Map<string, string | null> {
  for (const node of nodes) {
    map.set(node.id, parentId)
    buildParentMap(node.children, node.id, map)
  }
  return map
}

/**
 * Finds the nearest item that is currently rendered in `panel`.
 * Returns the item itself (isExact: true) if visible, or the nearest visible
 * ancestor (isExact: false) if the item is collapsed inside a parent.
 */
function findNearestVisible(
  itemId: string,
  parentMap: Map<string, string | null>,
  panel: HTMLElement,
): { id: string; isExact: boolean } | null {
  if (panel.querySelector(`[data-item-id="${itemId}"]`)) return { id: itemId, isExact: true }
  let current = parentMap.get(itemId)
  while (current !== undefined && current !== null) {
    if (panel.querySelector(`[data-item-id="${current}"]`)) return { id: current, isExact: false }
    current = parentMap.get(current)
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────────

export default function TreePanelView({ availableFrameworks = [], serverFrameworks = [], onLoadTargetFramework, isSourcePublished = false, onSaveAlignments, onLoadAlignmentsForTarget, onDiscoverAlignedTargets }: Props) {
  const {
    nodes,
    cfItems,
    frameworkEdges,
    rootItemIds,
    frameworkNodeId,
    frameworkInfo,
    cfDocument,
    selectedNodeId,
    onNodesChange,
    addChild,
    addDetachedItem,
  } = useEditor()

  const activeFrameworkId = frameworkNodeId

  // ── Core state ──
  const [targets, setTargets] = useState<TargetEntry[]>([])
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null)
  const [pendingAssociations, setPendingAssociations] = useState<PendingAssociation[]>([])
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [loadingTargetIds, setLoadingTargetIds] = useState<Set<string>>(() => new Set())
  const [loadedTargetIds, setLoadedTargetIds] = useState<Set<string>>(() => new Set())
  const [savingTargetId, setSavingTargetId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // ── Tree expansion state (lifted so line recalculation fires on every expand/collapse) ──
  const [leftExpandedIds, setLeftExpandedIds] = useState<Set<string>>(() => new Set())
  const [rightExpandedIds, setRightExpandedIds] = useState<Set<string>>(() => new Set())

  const handleLeftToggleExpand = useCallback((id: string) => {
    setLeftExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleRightToggleExpand = useCallback((id: string) => {
    setRightExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])
  // ── SVG overlay state ──
  const [lineCoords, setLineCoords] = useState<LineCoord[]>([])
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null)

  // ── Badge popover state ──
  const [popover, setPopover] = useState<PopoverState | null>(null)

  // ── DOM refs ──
  const containerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  // Stable refs for values used inside recalculateLines (avoids stale closures)
  const pendingRef = useRef(pendingAssociations)
  pendingRef.current = pendingAssociations
  const expandedTargetIdRef = useRef(expandedTargetId)
  expandedTargetIdRef.current = expandedTargetId

  const leftParentMapRef = useRef<Map<string, string | null>>(new Map())
  const rightParentMapRef = useRef<Map<string, string | null>>(new Map())

  // ── Tree data ──

  const leftRoots = useMemo(
    () => buildFrameworkTree(cfItems, frameworkEdges, rootItemIds),
    [cfItems, frameworkEdges, rootItemIds],
  )

  // Self-alignment target: when the expanded target IS the framework being edited, the right
  // panel must mirror the live editor state (not the stale snapshot in availableFrameworks),
  // otherwise it would show a copy missing any unsaved edits made in this session.
  const isSelfTarget = expandedTargetId !== null && expandedTargetId === activeFrameworkId

  const expandedTargetFramework = useMemo(
    () => (expandedTargetId ? availableFrameworks.find((f) => f.id === expandedTargetId) ?? null : null),
    [expandedTargetId, availableFrameworks],
  )

  const targetCfItems = useMemo(
    () => (isSelfTarget ? cfItems : expandedTargetFramework ? domainFrameworkToCfItems(expandedTargetFramework.framework) : []),
    [isSelfTarget, cfItems, expandedTargetFramework],
  )

  const rightRoots = useMemo(() => {
    if (isSelfTarget) return leftRoots
    if (!expandedTargetFramework) return []
    const edges = domainFrameworkToEdges(expandedTargetFramework.framework)
    const roots = domainFrameworkToRootIds(expandedTargetFramework.framework)
    return buildFrameworkTree(targetCfItems, edges, roots)
  }, [isSelfTarget, leftRoots, expandedTargetFramework, targetCfItems])

  // Keep parent maps current so recalculateLines can walk the tree without stale closure issues
  const leftParentMap = useMemo(() => buildParentMap(leftRoots), [leftRoots])
  const rightParentMap = useMemo(() => buildParentMap(rightRoots), [rightRoots])
  leftParentMapRef.current = leftParentMap
  rightParentMapRef.current = rightParentMap

  // The active framework is included so users can author intra-framework (self) alignments.
  const selectableFrameworks = useMemo(
    () => availableFrameworks.filter((f) => f.cfDocument?.frameworkType !== 'Alignment'),
    [availableFrameworks],
  )

  // Server-side frameworks not yet loaded locally — shown alongside loaded ones in the target selector
  const selectableServerFrameworks = useMemo(() => {
    const loadedIds = new Set(availableFrameworks.map((f) => f.id))
    return serverFrameworks.filter((f) => !loadedIds.has(f.id))
  }, [serverFrameworks, availableFrameworks])

  // Associated Frameworks list — the active framework always pinned first, then alphabetical by title.
  const sortedTargets = useMemo(() => {
    const titleFor = (id: string) => availableFrameworks.find((f) => f.id === id)?.cfDocument.title ?? id
    return targets.slice().sort((a, b) => {
      if (a.id === activeFrameworkId) return -1
      if (b.id === activeFrameworkId) return 1
      return titleFor(a.id).localeCompare(titleFor(b.id))
    })
  }, [targets, availableFrameworks, activeFrameworkId])

  // ── Modal: which frameworks can still be added ──

  const targetIds = useMemo(() => new Set(targets.map((t) => t.id)), [targets])

  const addableLocalFrameworks = useMemo(
    () =>
      selectableFrameworks
        .filter((f) => !targetIds.has(f.id))
        .slice()
        .sort((a, b) => (a.id === activeFrameworkId ? -1 : b.id === activeFrameworkId ? 1 : 0)),
    [selectableFrameworks, targetIds, activeFrameworkId],
  )

  const addableServerFrameworks = useMemo(
    () => selectableServerFrameworks.filter((f) => !targetIds.has(f.id)),
    [selectableServerFrameworks, targetIds],
  )

  // ── Association counts for badges (scoped to expanded target) ──

  const leftAssociationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of pendingAssociations) {
      if (a.toFrameworkId === expandedTargetId) {
        counts.set(a.fromItemId, (counts.get(a.fromItemId) ?? 0) + 1)
      }
    }
    return counts
  }, [pendingAssociations, expandedTargetId])

  const rightAssociationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of pendingAssociations) {
      if (a.toFrameworkId === expandedTargetId) {
        counts.set(a.toItemId, (counts.get(a.toItemId) ?? 0) + 1)
      }
    }
    return counts
  }, [pendingAssociations, expandedTargetId])

  // ── SVG line calculation ──

  const recalculateLines = useCallback(() => {
    const container = containerRef.current
    const leftPanel = leftPanelRef.current
    const rightPanel = rightPanelRef.current
    if (!container || !leftPanel || !rightPanel) {
      setLineCoords([])
      return
    }

    const containerRect = container.getBoundingClientRect()
    const leftScrollEl = leftPanel.querySelector('[data-scroll-container]')
    const rightScrollEl = rightPanel.querySelector('[data-scroll-container]')

    const computed = pendingRef.current
      .filter((assoc) => assoc.toFrameworkId === expandedTargetIdRef.current)
      .flatMap((assoc) => {
      // Use nearest visible ancestor if the exact item is collapsed inside a parent
      const leftHit = findNearestVisible(assoc.fromItemId, leftParentMapRef.current, leftPanel)
      const rightHit = findNearestVisible(assoc.toItemId, rightParentMapRef.current, rightPanel)
      if (!leftHit || !rightHit) return []

      const fromEl = leftPanel.querySelector<HTMLElement>(`[data-item-id="${leftHit.id}"]`)
      const toEl = rightPanel.querySelector<HTMLElement>(`[data-item-id="${rightHit.id}"]`)
      if (!fromEl || !toEl) return []

      const fromRect = fromEl.getBoundingClientRect()
      const toRect = toEl.getBoundingClientRect()

      // Skip if the rendered endpoint is scrolled outside its panel viewport
      if (leftScrollEl) {
        const r = leftScrollEl.getBoundingClientRect()
        if (fromRect.bottom < r.top || fromRect.top > r.bottom) return []
      }
      if (rightScrollEl) {
        const r = rightScrollEl.getBoundingClientRect()
        if (toRect.bottom < r.top || toRect.top > r.bottom) return []
      }

      const x1 = fromRect.right - containerRect.left
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
      const x2 = toRect.left - containerRect.left
      const y2 = toRect.top + toRect.height / 2 - containerRect.top

      const cpOffset = Math.min(100, Math.abs(x2 - x1) * 0.45)
      const d = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`

      return [{ id: assoc.id, d, midX: (x1 + x2) / 2, midY: (y1 + y2) / 2, isDashed: !(leftHit.isExact && rightHit.isExact) }]
    })

    setLineCoords(computed)
  }, [])

  // Recalculate whenever associations, target, or expansion state changes.
  // Expansion changes alter which items are in the DOM, so lines must be redrawn
  // (collapsed items fall back to their nearest visible ancestor).
  // targetFramework?.id catches the null→resolved transition for server-only frameworks.
  useEffect(() => {
    const id = requestAnimationFrame(recalculateLines)
    return () => cancelAnimationFrame(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAssociations, expandedTargetId, expandedTargetFramework?.id ?? null, leftExpandedIds, rightExpandedIds, recalculateLines])

  // Recalculate on scroll and resize
  useEffect(() => {
    const leftScroll = leftPanelRef.current?.querySelector('[data-scroll-container]')
    const rightScroll = rightPanelRef.current?.querySelector('[data-scroll-container]')
    const container = containerRef.current

    const listener = () => requestAnimationFrame(recalculateLines)

    leftScroll?.addEventListener('scroll', listener, { passive: true })
    rightScroll?.addEventListener('scroll', listener, { passive: true })
    globalThis.addEventListener('resize', listener, { passive: true })

    const obs = new ResizeObserver(listener)
    if (container) obs.observe(container)

    return () => {
      leftScroll?.removeEventListener('scroll', listener)
      rightScroll?.removeEventListener('scroll', listener)
      globalThis.removeEventListener('resize', listener)
      obs.disconnect()
    }
  }, [recalculateLines, expandedTargetId])

  // Close popover on outside click
  useEffect(() => {
    if (!popover) return
    const onDown = () => setPopover(null)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [popover])

  // Pre-populate the target list with frameworks that already have saved alignment docs,
  // then eagerly load their associations so counts are visible without expanding.
  useEffect(() => {
    if (!activeFrameworkId || !onDiscoverAlignedTargets) return
    void (async () => {
      const discovered = await onDiscoverAlignedTargets(activeFrameworkId)
      if (!discovered.length) return

      // Self-alignments (targetId === activeFrameworkId) are legitimate and kept.
      const newEntries = discovered

      setTargets((prev) => {
        const existingIds = new Set(prev.map((t) => t.id))
        const toAdd = newEntries
          .filter((d) => !existingIds.has(d.targetId))
          .map((d) => ({ id: d.targetId, alignmentDocId: d.alignmentDocId, hasUnsavedChanges: false }))
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev
      })

      if (!onLoadAlignmentsForTarget) return

      const targetIds = newEntries.map((e) => e.targetId)
      setLoadingTargetIds((prev) => new Set([...prev, ...targetIds]))

      await Promise.allSettled(
        newEntries.map(async ({ targetId }) => {
          try {
            const { docId, associations } = await onLoadAlignmentsForTarget(targetId)
            setTargets((prev) =>
              prev.map((t) => (t.id === targetId ? { ...t, alignmentDocId: docId } : t)),
            )
            setPendingAssociations((prev) => [
              ...prev.filter((a) => a.toFrameworkId !== targetId),
              ...(associations as PendingAssociation[]),
            ])
            setLoadedTargetIds((prev) => new Set([...prev, targetId]))
          } finally {
            setLoadingTargetIds((prev) => {
              const next = new Set(prev)
              next.delete(targetId)
              return next
            })
          }
        }),
      )
    })()
  }, [activeFrameworkId, onDiscoverAlignedTargets, onLoadAlignmentsForTarget])

  // When expanding a pre-populated target whose framework data isn't loaded yet, fetch it
  useEffect(() => {
    if (!expandedTargetId || !onLoadTargetFramework) return
    const isLoaded = availableFrameworks.some((f) => f.id === expandedTargetId)
    if (isLoaded) return
    const id = expandedTargetId
    setLoadingTargetIds((prev) => new Set([...prev, id]))
    void onLoadTargetFramework(id).finally(() => {
      setLoadingTargetIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedTargetId, onLoadTargetFramework])
  // availableFrameworks intentionally omitted — only needs to run when the expanded target changes

  // Load associations when a target is expanded for the first time
  useEffect(() => {
    if (!expandedTargetId || loadedTargetIds.has(expandedTargetId) || !onLoadAlignmentsForTarget) return
    const id = expandedTargetId
    setLoadingTargetIds((prev) => new Set([...prev, id]))
    void onLoadAlignmentsForTarget(id)
      .then(({ docId, associations }) => {
        setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, alignmentDocId: docId } : t)))
        setPendingAssociations((prev) => [
          ...prev.filter((a) => a.toFrameworkId !== id),
          ...(associations as PendingAssociation[]),
        ])
        setLoadedTargetIds((prev) => new Set([...prev, id]))
      })
      .catch(() => { /* keep existing state */ })
      .finally(() => {
        setLoadingTargetIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      })
  }, [expandedTargetId, loadedTargetIds, onLoadAlignmentsForTarget])

  // ── Mutation helpers ──

  const removePendingAssociation = useCallback((id: string) => {
    setPendingAssociations((prev) => {
      const assoc = prev.find((a) => a.id === id)
      if (assoc) {
        setTargets((ts) => ts.map((t) => (t.id === assoc.toFrameworkId ? { ...t, hasUnsavedChanges: true } : t)))
      }
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  // ── Drag handlers ──

  const handleSelect = (id: string) => {
    const deselects = nodes
      .filter((n) => n.selected && n.id !== id)
      .map((n) => ({ type: 'select' as const, id: n.id, selected: false }))
    onNodesChange([...deselects, { type: 'select' as const, id, selected: true }])
  }

  const handleRightDragOver = (id: string) => setDragOverItemId(id)
  const handleRightDragLeave = () => setDragOverItemId(null)

  const handleRightDrop = (toItemId: string, e: React.DragEvent) => {
    const fromItemId = e.dataTransfer.getData('text/plain')
    if (!fromItemId || !expandedTargetId) return
    if (fromItemId === toItemId) {
      // An item can't be aligned to itself.
      setDragOverItemId(null)
      return
    }

    // Resolve canonical URIs from the loaded CFItem data so they survive round-trips,
    // including the case where the destination framework is on a different server.
    const fromCfItem = cfItems.find((i) => i.identifier === fromItemId)
    const toCfItem = targetCfItems.find((i) => i.identifier === toItemId)
    const originUri = fromCfItem?.uri ?? `urn:case:item:${fromItemId}`
    const destinationUri = toCfItem?.uri ?? `urn:case:item:${toItemId}`

    setPendingAssociations((prev) => [
      ...prev,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `assoc-${Date.now()}`,
        fromItemId,
        toItemId,
        toFrameworkId: expandedTargetId,
        associationType: 'isRelatedTo',
        originUri,
        destinationUri,
      },
    ])
    setTargets((prev) => prev.map((t) => (t.id === expandedTargetId ? { ...t, hasUnsavedChanges: true } : t)))
    setDragOverItemId(null)
  }

  const handleAssociationTypeChange = useCallback((id: string, newType: string) => {
    setPendingAssociations((prev) => {
      const assoc = prev.find((a) => a.id === id)
      if (assoc) {
        setTargets((ts) => ts.map((t) => (t.id === assoc.toFrameworkId ? { ...t, hasUnsavedChanges: true } : t)))
      }
      return prev.map((a) => (a.id === id ? { ...a, associationType: newType } : a))
    })
  }, [])

  // Clicking a solid line collapses both panels by one level (inverse of dashed-line click).
  const handleSolidLineClick = useCallback((assocId: string) => {
    const assoc = pendingRef.current.find((a) => a.id === assocId)
    if (!assoc) return
    const leftParentId = leftParentMapRef.current.get(assoc.fromItemId)
    const rightParentId = rightParentMapRef.current.get(assoc.toItemId)
    if (leftParentId !== null && leftParentId !== undefined) {
      setLeftExpandedIds((prev) => { const next = new Set(prev); next.delete(leftParentId); return next })
    }
    if (rightParentId !== null && rightParentId !== undefined) {
      setRightExpandedIds((prev) => { const next = new Set(prev); next.delete(rightParentId); return next })
    }
  }, [])

  // Clicking a dashed line expands both panels to reveal the actual aligned items.
  const handleDashedLineClick = useCallback((assocId: string) => {
    const assoc = pendingRef.current.find((a) => a.id === assocId)
    if (!assoc) return
    const leftAncestors = ancestorsFromParentMap(assoc.fromItemId, leftParentMapRef.current)
    const rightAncestors = ancestorsFromParentMap(assoc.toItemId, rightParentMapRef.current)
    if (leftAncestors.length > 0) {
      setLeftExpandedIds((prev) => {
        const next = new Set(prev)
        leftAncestors.forEach((id) => next.add(id))
        return next
      })
    }
    if (rightAncestors.length > 0) {
      setRightExpandedIds((prev) => {
        const next = new Set(prev)
        rightAncestors.forEach((id) => next.add(id))
        return next
      })
    }
  }, [])

  // ── Badge popover handlers ──

  const handleLeftBadgeClick = useCallback((itemId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPopover({ itemId, side: 'left', x: rect.right + 8, y: rect.top })
  }, [])

  const handleRightBadgeClick = useCallback((itemId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPopover({ itemId, side: 'right', x: rect.left - 8, y: rect.top })
  }, [])

  // Associations relevant to the open popover
  const popoverAssociations = useMemo(() => {
    if (!popover) return []
    return pendingAssociations.filter((a) =>
      popover.side === 'left' ? a.fromItemId === popover.itemId : a.toItemId === popover.itemId,
    )
  }, [popover, pendingAssociations])

  // ── Save alignments ──

  const handleSaveAlignments = useCallback(async () => {
    const targetId = expandedTargetId
    if (!targetId || !expandedTargetFramework || !onSaveAlignments) return
    const target = targets.find((t) => t.id === targetId)
    if (!target?.hasUnsavedChanges) return

    setSavingTargetId(targetId)
    setSaveError(null)
    try {
      const now = new Date().toISOString()
      const sourceDocId = activeFrameworkId ?? ''
      const targetDocId = targetId
      // Both frameworks are stored on this server — use their canonical server URIs so
      // participants are referenced consistently regardless of import origin.
      const sourceDocUri = `/ims/case/v1p1/CFDocuments/${sourceDocId}`
      const targetDocUri = `/ims/case/v1p1/CFDocuments/${targetDocId}`
      const sourceTitle = frameworkInfo.title
      const targetTitle = isSelfTarget ? sourceTitle : (expandedTargetFramework.cfDocument.title ?? targetDocId)

      const targetAssociations = pendingAssociations.filter((a) => a.toFrameworkId === targetId)

      const cfPackage = {
        CFDocument: {
          identifier: target.alignmentDocId,
          uri: `/ims/case/v1p1/CFDocuments/${target.alignmentDocId}`,
          title: isSelfTarget ? `Internal Alignment: ${sourceTitle}` : `Alignment: ${sourceTitle} → ${targetTitle}`,
          creator: cfDocument?.creator ?? 'OpenCASE',
          frameworkType: 'Alignment',
          lastChangeDateTime: now,
          extensions: {
            'ext:opencase': {
              alignmentParticipants: [
                { identifier: sourceDocId, uri: sourceDocUri },
                { identifier: targetDocId, uri: targetDocUri },
              ],
            },
          },
        },
        CFItems: [],
        CFAssociations: targetAssociations.map((a) => {
          const fromItem = cfItems.find((i) => i.identifier === a.fromItemId)
          const toItem = targetCfItems.find((i) => i.identifier === a.toItemId)
          const fromTitle = (fromItem?.humanCodingScheme ?? fromItem?.abbreviatedStatement ?? fromItem?.fullStatement ?? a.fromItemId).slice(0, 200)
          const toTitle = (toItem?.humanCodingScheme ?? toItem?.abbreviatedStatement ?? toItem?.fullStatement ?? a.toItemId).slice(0, 200)
          return {
            identifier: a.id,
            uri: `/ims/case/v1p1/CFAssociations/${a.id}`,
            associationType: a.associationType,
            originNodeURI: { title: fromTitle, identifier: a.fromItemId, uri: a.originUri },
            destinationNodeURI: { title: toTitle, identifier: a.toItemId, uri: a.destinationUri },
            lastChangeDateTime: now,
          }
        }),
      }

      await onSaveAlignments(cfPackage)

      // Reload from server to keep associations current after save.
      if (onLoadAlignmentsForTarget) {
        try {
          const { docId, associations } = await onLoadAlignmentsForTarget(targetId)
          setTargets((prev) =>
            prev.map((t) => (t.id === targetId ? { ...t, alignmentDocId: docId, hasUnsavedChanges: false } : t)),
          )
          setPendingAssociations((prev) => [
            ...prev.filter((a) => a.toFrameworkId !== targetId),
            ...(associations as PendingAssociation[]),
          ])
        } catch {
          setTargets((prev) =>
            prev.map((t) => (t.id === targetId ? { ...t, hasUnsavedChanges: false } : t)),
          )
        }
      } else {
        setTargets((prev) =>
          prev.map((t) => (t.id === targetId ? { ...t, hasUnsavedChanges: false } : t)),
        )
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingTargetId(null)
    }
  }, [expandedTargetId, expandedTargetFramework, isSelfTarget, onSaveAlignments, targets, pendingAssociations, activeFrameworkId, cfDocument, frameworkInfo, cfItems, targetCfItems, onLoadAlignmentsForTarget])

  // ── Target accordion management ──

  const handleExpandTarget = useCallback((id: string) => {
    if (id === expandedTargetId) {
      // Clicking the same accordion entry collapses it
      setExpandedTargetId(null)
      return
    }
    const currentTarget = targets.find((t) => t.id === expandedTargetId)
    if (currentTarget?.hasUnsavedChanges) {
      if (!window.confirm('You have unsaved alignment changes. Discard them and switch?')) return
      setPendingAssociations((prev) => prev.filter((a) => a.toFrameworkId !== expandedTargetId))
      setTargets((prev) =>
        prev.map((t) => (t.id === expandedTargetId ? { ...t, hasUnsavedChanges: false } : t)),
      )
    }
    setExpandedTargetId(id)
    setRightExpandedIds(new Set())
    setPopover(null)
    setDragOverItemId(null)
  }, [expandedTargetId, targets])

  const handleAddTarget = useCallback(async (id: string) => {
    const isLoaded = availableFrameworks.some((f) => f.id === id)
    if (!isLoaded && onLoadTargetFramework) {
      setLoadingTargetIds((prev) => new Set([...prev, id]))
      try {
        await onLoadTargetFramework(id)
      } finally {
        setLoadingTargetIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    }
    setTargets((prev) => {
      if (prev.some((t) => t.id === id)) return prev
      const newDocId = globalThis.crypto?.randomUUID?.() ?? `align-${Date.now()}`
      return [...prev, { id, alignmentDocId: newDocId, hasUnsavedChanges: false }]
    })
    setIsAddModalOpen(false)
    handleExpandTarget(id)
  }, [availableFrameworks, onLoadTargetFramework, handleExpandTarget])

  // ── Layout ──

  const panelHeight = 'h-[calc(100vh-128px)]'
  const panelClass = `${panelHeight} flex w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm`

  return (
    <div
      className="flex h-full w-full overflow-y-auto px-8 py-8"
      onDragEnd={() => setDragOverItemId(null)}
    >
      {/* Two-panel row — SVG overlay lives inside this relative container */}
      <div
        ref={containerRef}
        className="relative flex w-full gap-8 mx-auto"
        style={{ maxWidth: 'calc(720px * 2 + 2rem)' }}
      >
        {/* SVG association lines overlay */}
        {lineCoords.length > 0 && (
          <svg
            className="pointer-events-none absolute inset-0"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
            aria-hidden
          >
            {lineCoords.map((line) => {
              const isHovered = hoveredLineId === line.id
              return (
                <g key={line.id}>
                  {/* Transparent hit area — solid lines collapse one level, dashed lines expand to reveal items */}
                  <path
                    d={line.d}
                    stroke="transparent"
                    strokeWidth={16}
                    fill="none"
                    className="pointer-events-auto cursor-pointer"
                    onMouseEnter={() => setHoveredLineId(line.id)}
                    onMouseLeave={() => setHoveredLineId(null)}
                    onClick={() => line.isDashed
                      ? handleDashedLineClick(line.id)
                      : handleSolidLineClick(line.id)
                    }
                  />
                  {/* Visible stroke: solid when both items are visible, dashed when proxied via ancestor */}
                  <path
                    d={line.d}
                    stroke={isHovered ? '#9333ea' : '#c084fc'}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeDasharray={line.isDashed ? '5 3' : undefined}
                    fill="none"
                    className="pointer-events-none"
                    style={{ transition: 'stroke 0.1s, stroke-width 0.1s' }}
                  />
                </g>
              )
            })}
          </svg>
        )}

        {/* Left panel — source framework */}
        <div ref={leftPanelRef} className={panelClass}>
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <FrameworkTreeList
                title={frameworkInfo.title}
                description={cfDocument?.description}
                publisher={cfDocument?.publisher}
                frameworkNodeId={frameworkNodeId}
                roots={leftRoots}
                selectedId={selectedNodeId}
                expandedIds={leftExpandedIds}
                onToggleExpand={handleLeftToggleExpand}
                onSelect={handleSelect}
                onAddChild={addChild}
                isDraggable={Boolean(expandedTargetFramework) && isSourcePublished}
                onDragStart={() => { /* cursor hint only */ }}
                associationCounts={leftAssociationCounts}
                onBadgeClick={handleLeftBadgeClick}
              />
            </div>
            {/* Gate callout — shown only when a target is expanded but source hasn't been saved */}
            {expandedTargetFramework && !isSourcePublished && (
              <div className="shrink-0 border-t border-amber-200 bg-amber-50 px-4 py-2.5">
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Save this framework first</span> to enable alignment authoring.
                  Items need stable server-assigned URIs before associations can be created.
                </p>
              </div>
            )}
            <div className="shrink-0 border-t border-black/10 p-3">
              <button
                type="button"
                onClick={addDetachedItem}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 transition-colors hover:border-teal-400 hover:text-teal-600 focus:outline-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Add framework item
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — accordion list of target frameworks */}
        <div ref={rightPanelRef} className={panelClass}>
          <div className="flex h-full flex-col overflow-hidden">
            <div className="shrink-0 border-b border-black/10 bg-blue-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Associated Frameworks</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {targets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-slate-400">
                  <p className="font-medium text-slate-500">No target frameworks</p>
                  <p className="text-xs leading-relaxed">
                    Add a framework below, then drag items from the left panel onto items here to
                    create crosswalk associations.
                  </p>
                </div>
              ) : (
                sortedTargets.map((target) => {
                  const fw = availableFrameworks.find((f) => f.id === target.id)
                  const isExpanded = target.id === expandedTargetId
                  const targetAssocCount = pendingAssociations.filter((a) => a.toFrameworkId === target.id).length
                  const isLoading = loadingTargetIds.has(target.id)
                  const isSelf = target.id === activeFrameworkId

                  return (
                    <div key={target.id} className="border-b border-black/10 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => { handleExpandTarget(target.id) }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                          {fw?.cfDocument.title ?? target.id}
                          {isSelf && <span className="text-slate-400"> (this framework)</span>}
                        </span>
                        {isLoading && (
                          <span className="shrink-0 animate-pulse text-[10px] text-slate-400">Loading…</span>
                        )}
                        {targetAssocCount > 0 && !isLoading && (
                          <span className="shrink-0 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                            {targetAssocCount}
                          </span>
                        )}
                        {target.hasUnsavedChanges && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" title="Unsaved changes" />
                        )}
                      </button>

                      {isExpanded && fw && (
                        <div className="flex flex-col border-t border-black/5">
                          <div className="h-[calc(100vh-330px)] overflow-hidden">
                            <FrameworkTreeList
                              title={fw.cfDocument.title}
                              frameworkNodeId={null}
                              roots={rightRoots}
                              selectedId={null}
                              expandedIds={rightExpandedIds}
                              onToggleExpand={handleRightToggleExpand}
                              noHeader
                              isDropTarget
                              onDragOver={handleRightDragOver}
                              onDragLeave={handleRightDragLeave}
                              onDrop={handleRightDrop}
                              dragOverItemId={dragOverItemId}
                              associationCounts={rightAssociationCounts}
                              onBadgeClick={handleRightBadgeClick}
                            />
                          </div>
                          {isSourcePublished && onSaveAlignments && target.hasUnsavedChanges && (
                            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/10 bg-slate-50 px-4 py-2.5">
                              <span className="text-xs text-slate-600">
                                {targetAssocCount > 0
                                  ? `${targetAssocCount} association${targetAssocCount !== 1 ? 's' : ''} — unsaved`
                                  : 'Unsaved changes'}
                              </span>
                              <div className="flex items-center gap-2">
                                {saveError && (
                                  <span className="max-w-[140px] truncate text-xs text-red-600" title={saveError}>
                                    {saveError}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  disabled={savingTargetId === target.id}
                                  onClick={handleSaveAlignments}
                                  className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                                >
                                  {savingTargetId === target.id ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="shrink-0 border-t border-black/10 p-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 transition-colors hover:border-teal-400 hover:text-teal-600 focus:outline-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Add associated framework
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Badge popover — fixed-position, rendered outside the scroll container */}
      {popover && popoverAssociations.length > 0 && (
        <div
          style={{
            position: 'fixed',
            zIndex: 50,
            top: popover.y,
            ...(popover.side === 'left'
              ? { left: popover.x }
              : { right: globalThis.innerWidth - popover.x }),
          }}
          className="min-w-[220px] max-w-[300px] rounded-xl border border-black/10 bg-white p-2 shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {popoverAssociations.length} association{popoverAssociations.length !== 1 ? 's' : ''}
          </p>
          {popoverAssociations.map((assoc) => {
            const connectedItem =
              popover.side === 'left'
                ? targetCfItems.find((i) => i.identifier === assoc.toItemId)
                : cfItems.find((i) => i.identifier === assoc.fromItemId)
            const label =
              connectedItem?.humanCodingScheme ??
              connectedItem?.abbreviatedStatement ??
              connectedItem?.fullStatement ??
              (popover.side === 'left' ? assoc.toItemId : assoc.fromItemId)
            return (
              <div
                key={assoc.id}
                className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-slate-50"
              >
                <select
                  className="shrink-0 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 border-none focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                  value={assoc.associationType}
                  onChange={(e) => handleAssociationTypeChange(assoc.id, e.target.value)}
                  title="Association type"
                >
                  {ALIGNMENT_ASSOCIATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                  {/* Preserve any loaded type not in the standard list */}
                  {!ALIGNMENT_ASSOCIATION_TYPES.some((t) => t.value === assoc.associationType) && (
                    <option value={assoc.associationType}>{assoc.associationType}</option>
                  )}
                </select>
                <span
                  className="min-w-0 flex-1 truncate text-xs text-slate-700"
                  title={connectedItem?.fullStatement}
                >
                  {label}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 focus:outline-none"
                  onClick={() => {
                    removePendingAssociation(assoc.id)
                    if (popoverAssociations.length <= 1) setPopover(null)
                  }}
                  title="Remove association"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add framework modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-[420px] max-h-[520px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-black/10 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Add Target Framework</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Select a framework to add to the crosswalk panel.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {addableLocalFrameworks.length === 0 && addableServerFrameworks.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">
                  All available frameworks have already been added.
                </p>
              ) : (
                <>
                  {addableLocalFrameworks.map((fw) => {
                    const isSelf = fw.id === activeFrameworkId
                    return (
                      <button
                        key={fw.id}
                        type="button"
                        onClick={() => { void handleAddTarget(fw.id) }}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-700">
                            {fw.cfDocument.title}
                          </span>
                          <span className="block truncate text-xs text-slate-400">
                            {isSelf ? 'This framework — create associations within it' : fw.cfDocument.publisher}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                  {addableServerFrameworks.length > 0 && addableLocalFrameworks.length > 0 && (
                    <div className="my-1 border-t border-black/5" />
                  )}
                  {addableServerFrameworks.map((fw) => (
                    <button
                      key={fw.id}
                      type="button"
                      onClick={() => { void handleAddTarget(fw.id) }}
                      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-700">{fw.title}</span>
                        <span className="block text-xs text-slate-400">From server</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="shrink-0 border-t border-black/10 px-4 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
