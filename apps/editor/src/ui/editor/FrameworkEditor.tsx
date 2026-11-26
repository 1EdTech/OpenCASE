import { useCallback, useRef, useState } from 'react'
import EditorHeader from '@/ui/editor/components/EditorHeader'
import NodePropertiesPanel from '@/ui/editor/components/NodePropertiesPanel'
import AddItemDialog from '@/ui/editor/components/AddItemDialog'
import ConfirmActionDialog from '@/ui/editor/components/ConfirmActionDialog'
import ConfirmLeaveDialog from '@/ui/editor/components/ConfirmLeaveDialog'
import ViewCFPackageDialog from '@/ui/editor/components/ViewCFPackageDialog'
import TreePanelView, { type CgeTargetSupport } from '@/ui/editor/treePanel/TreePanelView'
import { useEditor } from '@/ui/editor/state/EditorContext'
import type { CaseExtensions, CFDocument, CFItem, CFPackage } from '@/domain/case/types'
import type { HomeFramework } from '@/ui/home/frameworkStore'
import { useAuth } from '@/app/providers/AuthProvider'
import { fromEditorGraph } from '@/ui/editor/state/mapping/fromEditorGraph'
import { frameworkToCfPackage, toOpenCaseFormat } from '@/application/framework/mappers/case/toCasePackage'
import type { Framework } from '@/domain/framework/model/types'
import { hasFrameworkDataChanged } from '@/domain/framework/hasFrameworkDataChanged'
import { withOffCanvasAssociations } from '@/domain/framework/offCanvasAssociations'
import { alignmentMoveCount, type AlignmentStoragePlan } from '@/application/framework/services/AlignmentStorage'
import type { HostedDocumentRef } from '@/domain/framework/externalAlignments'
import { applyInlineAlignmentEdits } from '@/domain/framework/inlineAlignmentEdits'

type MirrorStatus = { isModifiedFromSource?: boolean; sourcePackageURI?: string }

type FrameworkEditorProps = {
  onBack?: () => void
  onSaveToServer?: (cfPackage: ReturnType<typeof toOpenCaseFormat>, framework: Framework, plan?: AlignmentStoragePlan) => Promise<void>
  /** Works out which associations a save will move for the framework's alignment storage setting, without saving */
  onPlanAlignmentStorage?: (cfPackage: ReturnType<typeof toOpenCaseFormat>, framework: Framework) => Promise<AlignmentStoragePlan>
  /** Fetch the published CFPackage from the server (returns CASE JSON with absolute URIs) */
  onFetchCfPackage?: () => Promise<CFPackage>
  /** All locally-available frameworks — used to populate the crosswalk target selector in tree view */
  availableFrameworks?: HomeFramework[]
  /** Server-side framework summaries not yet loaded locally — shown in crosswalk target selector for auto-load */
  serverFrameworks?: Array<{ id: string; title: string }>
  /** Load a framework from the server into the local session (called when a server-only crosswalk target is selected) */
  onLoadTargetFramework?: (id: string) => Promise<void>
  /** Save a serialized alignment CFPackage to the server */
  onSaveAlignments?: (cfPackage: unknown) => Promise<void>
  /** Load existing alignment associations for a target framework pairing */
  onLoadAlignmentsForTarget?: (targetId: string) => Promise<{
    docId: string
    associations: Array<{ id: string; fromItemId: string; toItemId: string; toFrameworkId: string; associationType: string; originUri: string; destinationUri: string }>
  }>
  /** Discover all frameworks that already have saved alignment docs with the given source framework */
  onDiscoverAlignedTargets?: (sourceId: string) => Promise<Array<{ targetId: string; alignmentDocId: string }>>
  /** Resolve item identifiers to the hosted frameworks that hold them — used by the tree view to place inline external alignments */
  onLookupItemDocuments?: (identifiers: string[]) => Promise<Record<string, HostedDocumentRef>>
  /** Mirror/fork status of the open framework, if it was ever imported */
  mirrorStatus?: MirrorStatus
  /** Read-only cached remote framework (CGE cache) */
  readOnly?: boolean
  /** Extensions on the open framework's own CFDefinitions object — the editor can't author them, so they're carried through on save */
  cfDefinitionsExtensions?: CaseExtensions
  /** The framework as loaded — its associations to nodes outside this framework have no graph edge, so they're carried through on save */
  loadedFramework?: Framework
  /** Changes whenever a save moved associations between this framework and its alignment frameworks */
  alignmentsRevision?: number
  /** CASE Global search and refresh for the Tree View's target picker */
  cge?: CgeTargetSupport
}

/** The fork warning's sentence about associations a save will move. */
function describeAlignmentMove(plan: AlignmentStoragePlan, count: number): string {
  const associations = count === 1 ? '1 association' : `${count} associations`
  return plan.kind === 'toInline'
    ? `${associations} to frameworks on this server will move from alignment frameworks into this framework.`
    : `${associations} to frameworks on this server will move from this framework into alignment frameworks.`
}

/** The framework editor: header, Tree View, item/framework properties, and save. */
export default function FrameworkEditor({ onBack, onSaveToServer, onPlanAlignmentStorage, onFetchCfPackage, availableFrameworks, serverFrameworks, onLoadTargetFramework, onSaveAlignments, onLoadAlignmentsForTarget, onDiscoverAlignedTargets, onLookupItemDocuments, mirrorStatus, readOnly, cfDefinitionsExtensions, loadedFramework, alignmentsRevision, cge }: Readonly<FrameworkEditorProps>) {
  const { status: authStatus, userName, tenantId, signOut, changePassword } = useAuth()
  const {
    nodes,
    edges,
    selectedNode,
    frameworkInfo,
    clearSelection,
    updateNodeData,
    cfItemTypes,
    ensureCfItemType,
    cfSubjects,
    ensureCfSubject,
    cfConcepts,
    ensureCfConcept,
    cfLicenses,
    cfAssociationGroupings,
    addItemDialog,
    setAddItemDraft,
    cancelAddItem,
    confirmAddItem,
    isDirty,
    clearDirty,
    caseVersion,
    inlineAlignmentEdits,
    clearInlineAlignmentEdits,
  } = useEditor()

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [cfPackageDialogOpen, setCfPackageDialogOpen] = useState(false)
  const [generatedCfPackage, setGeneratedCfPackage] = useState<CFPackage | null>(null)
  const [viewCaseLoading, setViewCaseLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [forkWarningOpen, setForkWarningOpen] = useState(false)

  // Baseline Framework snapshot for fork-detection — captured once when this
  // session's graph first loads, and refreshed after every successful save.
  // Only ever needs to change mid-session for a fork itself, and once forked
  // mirrorStatus.isModifiedFromSource flips true, permanently disabling the
  // gate below — so a single per-mount baseline is sufficient.
  const baselineFrameworkRef = useRef<Framework | null>(null)
  if (baselineFrameworkRef.current === null) {
    const baseline = fromEditorGraph({ graph: { nodes, edges } }).framework
    baselineFrameworkRef.current = loadedFramework ? withOffCanvasAssociations(loadedFramework, baseline) : baseline
  }
  const pendingSaveRef = useRef<{ openCasePackage: ReturnType<typeof toOpenCaseFormat>; framework: Framework; plan?: AlignmentStoragePlan } | null>(null)
  // What the fork warning says about associations the save will move, if any.
  const [forkWarningMove, setForkWarningMove] = useState<string | null>(null)

  // ── Refs for save/export (keeps callbacks stable, avoids re-renders) ──
  const graphRef = useRef({ nodes, edges, inlineAlignmentEdits })
  graphRef.current = { nodes, edges, inlineAlignmentEdits }
  const saveCtxRef = useRef({ caseVersion, cfItemTypes, cfSubjects, cfConcepts, cfLicenses, cfAssociationGroupings, cfDefinitionsExtensions, loadedFramework })
  saveCtxRef.current = { caseVersion, cfItemTypes, cfSubjects, cfConcepts, cfLicenses, cfAssociationGroupings, cfDefinitionsExtensions, loadedFramework }

  // Open the CFPackage viewer. Every framework open in the editor has been saved to the
  // server, so the server copy (absolute URIs, no OpenCASE extensions) is the export.
  const handleViewCFPackage = useCallback(async () => {
    if (!onFetchCfPackage) return
    setCfPackageDialogOpen(true)
    setViewCaseLoading(true)
    try {
      const pkg = await onFetchCfPackage()
      setGeneratedCfPackage(pkg)
    } finally {
      setViewCaseLoading(false)
    }
  }, [onFetchCfPackage])

  // Actually perform the save (network call). Split out from `handleSave` so
  // the fork-warning dialog can defer this until the user confirms.
  const doSave = useCallback(async (openCasePackage: ReturnType<typeof toOpenCaseFormat>, framework: Framework, plan?: AlignmentStoragePlan) => {
    if (onSaveToServer) {
      setSaveStatus('saving')
      setSaveError(null)
      try {
        await onSaveToServer(openCasePackage, framework, plan)
        baselineFrameworkRef.current = framework
        setSaveStatus('success')
        clearDirty()
        clearInlineAlignmentEdits()
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        console.error('[Save] Failed to save to server:', err)
        setSaveStatus('error')
        setSaveError(err instanceof Error ? err.message : 'Failed to save')
      }
    } else {
      setCfPackageDialogOpen(true)
    }
  }, [onSaveToServer, clearDirty, clearInlineAlignmentEdits])

  // Save: Generate CFPackage and POST to server — unless this framework is
  // still a pristine mirror and the pending edits touch actual framework
  // data, in which case warn first: saving will fork it into an independent
  // local copy.
  const handleSave = useCallback(async () => {
    const { nodes: n, edges: e, inlineAlignmentEdits: inlineEdits } = graphRef.current
    const ctx = saveCtxRef.current
    const fromGraph = fromEditorGraph({ graph: { nodes: n, edges: e } }).framework
    const withOffCanvas = ctx.loadedFramework ? withOffCanvasAssociations(ctx.loadedFramework, fromGraph) : fromGraph
    // Tree View edits to inline associations to other frameworks live outside the graph.
    const framework = applyInlineAlignmentEdits(withOffCanvas, inlineEdits)
    const cfPackage = frameworkToCfPackage({
      framework,
      caseVersion: ctx.caseVersion,
      cfItemTypes: ctx.cfItemTypes, cfSubjects: ctx.cfSubjects,
      cfConcepts: ctx.cfConcepts, cfLicenses: ctx.cfLicenses, cfAssociationGroupings: ctx.cfAssociationGroupings,
      definitionsExtensions: ctx.cfDefinitionsExtensions,
    })
    const openCasePackage = toOpenCaseFormat(cfPackage)

    const baseline = baselineFrameworkRef.current
    const isPristineMirror = mirrorStatus?.isModifiedFromSource === false && baseline !== null
    const storageChanged = baseline !== null &&
      (baseline.metadata.alignmentStorage ?? 'inline') !== (framework.metadata.alignmentStorage ?? 'inline')

    // Changing where associations to other frameworks are stored can move some on save, which is a
    // data change. Ask the server what would move, so the warning only shows when something does.
    let plan: AlignmentStoragePlan | undefined
    if (isPristineMirror && storageChanged && onPlanAlignmentStorage) {
      try {
        plan = await onPlanAlignmentStorage(openCasePackage, framework)
      } catch (err) {
        setSaveStatus('error')
        setSaveError(err instanceof Error ? err.message : 'Failed to save')
        return
      }
    }
    const moving = plan ? alignmentMoveCount(plan) : 0

    if (isPristineMirror && (hasFrameworkDataChanged(baseline, framework) || moving > 0)) {
      pendingSaveRef.current = { openCasePackage, framework, plan }
      setForkWarningMove(plan && moving > 0 ? describeAlignmentMove(plan, moving) : null)
      setForkWarningOpen(true)
      return
    }

    await doSave(openCasePackage, framework, plan)
  }, [mirrorStatus, doSave, onPlanAlignmentStorage])

  const addItemParentLabel = (() => {
    const parent = nodes.find((n) => n.id === addItemDialog.parentId)
    if (!parent) return undefined
    if (parent.type === 'caseFrameworkNode') return (parent.data as { cfDocument?: CFDocument })?.cfDocument?.title ?? 'Framework'
    const cfItem = (parent.data as { cfItem?: CFItem })?.cfItem
    return cfItem?.humanCodingScheme ?? cfItem?.abbreviatedStatement ?? cfItem?.fullStatement ?? 'Item'
  })()

  return (
    <div className="relative h-screen w-screen">
      <EditorHeader
        frameworkTitle={frameworkInfo.title}
        frameworkSubtitle={frameworkInfo.subtitle}
        // Labels mirror the home screen's framework card, so they reflect the
        // last-saved framework rather than unsaved edits.
        frameworkLabels={{
          adoptionStatus: loadedFramework?.metadata?.adoptionStatus,
          readOnly,
          publicAccess: loadedFramework?.metadata?.publicAccess === true,
        }}
        userName={userName ?? undefined}
        tenantId={tenantId ?? undefined}
        onChangePassword={authStatus === 'authenticated' && changePassword ? () => void changePassword() : undefined}
        reserveRightForPanel={Boolean(selectedNode)}
        isDirty={isDirty}
        saveStatus={saveStatus}
        saveError={saveError}
        onSave={handleSave}
        onSignIn={undefined}
        onSignOut={
          authStatus !== 'authenticated'
            ? undefined
            : () => {
                void signOut()
              }
        }
        onBack={
          onBack
            ? () => {
                if (isDirty) setLeaveOpen(true)
                else onBack()
              }
            : undefined
        }
      />

      <div className="h-full w-full pt-16">
        <TreePanelView
          availableFrameworks={availableFrameworks}
          serverFrameworks={serverFrameworks}
          onLoadTargetFramework={onLoadTargetFramework}
          onSaveAlignments={onSaveAlignments}
          onLoadAlignmentsForTarget={onLoadAlignmentsForTarget}
          onDiscoverAlignedTargets={onDiscoverAlignedTargets}
          loadedFramework={loadedFramework}
          onLookupItemDocuments={onLookupItemDocuments}
          alignmentsRevision={alignmentsRevision}
          cge={cge}
        />
      </div>

      <NodePropertiesPanel
        node={selectedNode}
        onClose={clearSelection}
        onChangeNode={updateNodeData}
        onViewCFPackage={handleViewCFPackage}
        availableLicenses={cfLicenses}
        cfItemTypes={cfItemTypes}
        ensureCfItemType={ensureCfItemType}
        cfSubjects={cfSubjects}
        ensureCfSubject={ensureCfSubject}
        cfConcepts={cfConcepts}
        ensureCfConcept={ensureCfConcept}
      />

      <AddItemDialog
        open={addItemDialog.open}
        parentLabel={addItemParentLabel}
        draft={addItemDialog.draft}
        onChange={setAddItemDraft}
        onCancel={cancelAddItem}
        onCreate={confirmAddItem}
        cfItemTypes={cfItemTypes}
        cfSubjects={cfSubjects}
      />

      <ConfirmLeaveDialog
        open={leaveOpen}
        onCancel={() => setLeaveOpen(false)}
        onLeave={() => {
          setLeaveOpen(false)
          onBack?.()
        }}
      />

      <ConfirmActionDialog
        open={forkWarningOpen}
        title="Fork this mirrored framework?"
        description={`You are making changes to a mirrored framework. Saving will turn this mirror into an independent local copy with new identifiers.${forkWarningMove ? ` ${forkWarningMove}` : ''}`}
        confirmLabel="Save & fork"
        onCancel={() => {
          setForkWarningOpen(false)
          pendingSaveRef.current = null
        }}
        onConfirm={() => {
          setForkWarningOpen(false)
          const pending = pendingSaveRef.current
          pendingSaveRef.current = null
          if (pending) void doSave(pending.openCasePackage, pending.framework, pending.plan)
        }}
      />

      <ViewCFPackageDialog
        open={cfPackageDialogOpen}
        onClose={() => {
          setCfPackageDialogOpen(false)
          setGeneratedCfPackage(null)
        }}
        cfPackage={generatedCfPackage}
        caseVersion={caseVersion}
        loading={viewCaseLoading}
      />
    </div>
  )
}
