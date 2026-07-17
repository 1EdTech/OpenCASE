import { memo, useEffect, useMemo, useState } from 'react'
import type { CheckedState } from '@radix-ui/react-checkbox'
import { Button } from '@/ui/shared/components/ui/button'
import { Checkbox } from '@/ui/shared/components/ui/checkbox'
import { Label } from '@/ui/shared/components/ui/label'
import { ComboboxInput } from '@/ui/shared/components/ui/combobox-input'
import { TagComboboxInput } from '@/ui/shared/components/ui/tag-combobox-input'
import type { TagComboboxOption } from '@/ui/shared/components/ui/tag-combobox-input'
import { ADOPTION_STATUS_OPTIONS } from '@/domain/framework/model/adoptionStatus'
import type {
  CaseEditorNodeDataPatch,
  CaseEditorNodeType,
  CaseFrameworkNodeType,
  CaseItemNodeType,
  ExternalFrameworkNodeType,
  ExternalFrameworkNodeData,
} from '../reactflow/types'
import type { CFConcept, CFDocument, CFItem, CFItemType, CFLicense, CFSubject } from '@/domain/case/types'
import type { ComboboxOption } from '@/ui/shared/components/ui/combobox-input'
import { EDUCATION_LEVEL_OPTIONS } from '@/ui/editor/terminology/educationLevels'
import type { EducationLevelOption } from '@/ui/editor/terminology/educationLevels'
import { getAppConfig } from '@/app/config'
import ColorBandPicker from '@/ui/editor/components/ColorBandPicker'
import SidebarSection from './SidebarSection'
import type { RemoteItemLink } from '@/ui/editor/remoteFramework/remoteFrameworkTypes'
import { CASE_ASSOCIATION_TYPES } from '../reactflow/types'
import { ArrowPathIcon } from '@heroicons/react/24/solid'

/* ── Shared styling constants ── */
const INPUT_CLS = 'w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2'
const LABEL_CLS = 'mb-1.5 block text-sm font-medium text-slate-700'
const HINT_CLS = 'mt-1.5 text-sm text-slate-500'

type Props = {
  node: CaseEditorNodeType | null
  onClose?: () => void
  onChangeNode?: (_nodeId: string, _patch: CaseEditorNodeDataPatch) => void
  onViewCFPackage?: () => void
  isPublishedToOpenCase?: boolean
  availableLicenses?: CFLicense[]
  cfItemTypes?: CFItemType[]
  ensureCfItemType?: (_title: string) => CFItemType | null
  cfSubjects?: CFSubject[]
  ensureCfSubject?: (_title: string) => CFSubject | null
  cfConcepts?: CFConcept[]
  ensureCfConcept?: (_title: string) => CFConcept | null
  remoteLinks?: RemoteItemLink[]
  onRemoveRemoteLink?: (_linkId: string) => void
  onUpdateRemoteLinkType?: (_linkId: string, _associationType: string) => void
  onRemoveRemoteFramework?: (_nodeId: string) => void
  onBrowseRemoteItems?: (_nodeId: string) => void
  onRefreshRemoteFramework?: () => Promise<void>
  remoteFrameworkRefreshing?: boolean
}

export default memo(function NodePropertiesPanel({
  node, onClose, onChangeNode, onViewCFPackage, isPublishedToOpenCase, availableLicenses,
  cfItemTypes = [], ensureCfItemType, cfSubjects = [], ensureCfSubject, cfConcepts = [], ensureCfConcept,
  remoteLinks = [], onRemoveRemoteLink, onUpdateRemoteLinkType,
  onRemoveRemoteFramework, onBrowseRemoteItems, onRefreshRemoteFramework, remoteFrameworkRefreshing,
}: Readonly<Props>) {
  const [copied, setCopied] = useState<null | 'code' | 'uri' | 'opencase'>(null)
  const [conceptInput, setConceptInput] = useState('')

  useEffect(() => {
    if (!node) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [node, onClose])

  const isItemNode = (n: CaseEditorNodeType): n is CaseItemNodeType => n.type === 'caseItemNode'
  const isFrameworkNode = (n: CaseEditorNodeType): n is CaseFrameworkNodeType => n.type === 'caseFrameworkNode'
  const isExternalFrameworkNode = (n: CaseEditorNodeType): n is ExternalFrameworkNodeType => n.type === 'externalFrameworkNode'

  const isFramework = Boolean(node && isFrameworkNode(node))
  const isExternalFramework = Boolean(node && isExternalFrameworkNode(node))

  const cfItem: CFItem | undefined = node && isItemNode(node) ? node.data.cfItem : undefined
  const cfDocument: CFDocument | undefined = node && isFrameworkNode(node) ? node.data.cfDocument : undefined
  const externalData: ExternalFrameworkNodeData | undefined = node && isExternalFrameworkNode(node) ? node.data : undefined

  useEffect(() => {
    setConceptInput(cfItem?.conceptKeywordsURI?.title ?? '')
  }, [node?.id, cfItem?.conceptKeywordsURI?.title])

  /* ── Dedup helper ── */
  const dedup = <T extends { value: string }>(arr: T[]): T[] => {
    const seen = new Set<string>()
    return arr.filter((o) => { if (seen.has(o.value)) return false; seen.add(o.value); return true })
  }

  const cfItemTypeOptions: ComboboxOption[] = useMemo(
    () => dedup(cfItemTypes.map((t) => ({ value: t.title ?? t.identifier, label: t.title ?? t.identifier, description: t.description }))),
    [cfItemTypes],
  )
  const cfSubjectOptions: TagComboboxOption[] = useMemo(
    () => dedup(cfSubjects.map((s) => ({ value: s.title ?? s.identifier, label: s.title ?? s.identifier, description: s.description }))),
    [cfSubjects],
  )
  const cfConceptOptions: ComboboxOption[] = useMemo(
    () => dedup(cfConcepts.map((c) => ({ value: c.title ?? c.identifier, label: c.title ?? c.identifier, description: c.description }))),
    [cfConcepts],
  )
  const educationLevelOptions: TagComboboxOption[] = useMemo(
    () => (EDUCATION_LEVEL_OPTIONS as readonly EducationLevelOption[]).map((o) => ({ value: o.value, label: o.label })),
    [],
  )

  /* ── Update helpers ── */
  const updateItem = (patch: Partial<CFItem>) => {
    if (!node) return
    onChangeNode?.(node.id, { cfItem: { ...patch, lastChangeDateTime: new Date().toISOString() } })
  }
  const updateDocument = (patch: Partial<CFDocument>) => {
    if (!node) return
    onChangeNode?.(node.id, { cfDocument: { ...patch, lastChangeDateTime: new Date().toISOString() } })
  }
  const updateExternalFramework = (patch: Partial<ExternalFrameworkNodeData>) => {
    if (!node) return
    onChangeNode?.(node.id, patch)
  }


  const copyToClipboard = async (text: string, kind: 'code' | 'uri' | 'opencase') => {
    try {
      await globalThis.navigator?.clipboard?.writeText(text)
      setCopied(kind)
      globalThis.setTimeout(() => setCopied(null), 1200)
    } catch { /* best-effort */ }
  }

  const opencaseUrl = useMemo(() => {
    if (!cfDocument?.identifier) return null
    try {
      const { opencaseBaseUrl } = getAppConfig()
      const base = opencaseBaseUrl.replace(/\/+$/, '')
      return `${base}/ims/case/v1p1/CFPackages/${cfDocument.identifier}`
    } catch { return null }
  }, [cfDocument])

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }).format(d)
  }

  /* ── Color accent ── */
  const accentColor = cfItem?.colorBand || undefined

  const isOpen = Boolean(node)

  /* ── Title for the header ── */
  const headerTitle = isExternalFramework
    ? (externalData?.title || 'External framework')
    : isFramework
      ? (cfDocument?.title ?? 'Untitled framework')
      : (cfItem?.humanCodingScheme ?? cfItem?.alternativeLabel ?? cfItem?.CFItemType ?? 'Untitled item')

  const headerSubtitle = isExternalFramework
    ? (externalData?.cacheError
        ? 'Cache unavailable'
        : externalData?.cacheDocId
          ? 'Cached remote framework'
          : externalData?.cacheLoading
            ? 'Downloading cache…'
            : 'Remote framework (not cached)')
    : isFramework
      ? 'Framework'
      : (cfItem?.CFItemType ?? 'Item')

  const itemRemoteLinks = node && isItemNode(node)
    ? remoteLinks.filter((l) => l.localItemId === node.id)
    : []

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-20 flex h-screen w-[min(460px,92vw)] flex-col border-l border-black/10 bg-slate-50 text-slate-900 shadow-[-16px_0_40px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      aria-label={isExternalFramework ? 'External framework details' : isFramework ? 'Framework details' : 'Item details'}
    >
      {/* ── Sticky header ── */}
      <div className="flex items-center gap-3 border-b border-black/8 bg-white px-4 py-3.5">
        {accentColor ? (
          <div className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-500">{headerSubtitle}</div>
          <div className="truncate text-lg font-semibold leading-tight text-slate-900">{headerTitle}</div>
        </div>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Scrollable body ── */}
      {node && isExternalFramework ? (
        <div className="flex-1 overflow-auto px-2 py-3">
          <div className="space-y-1">
            <SidebarSection title="Basic information" subtitle="Details about this external reference." accentColor="#d97706">
              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLS} htmlFor="ext-title">Title</label>
                  <input id="ext-title" className={INPUT_CLS} value={externalData?.title ?? ''} onChange={(e) => updateExternalFramework({ title: e.target.value })} placeholder="e.g., Common Core State Standards" />
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="ext-uri">URI / Identifier</label>
                  <input id="ext-uri" className={`${INPUT_CLS} font-mono`} value={externalData?.uri ?? ''} onChange={(e) => updateExternalFramework({ uri: e.target.value })} placeholder="e.g., urn:case:framework:ccss-math" />
                  <div className={HINT_CLS}>The unique identifier or URI for this framework.</div>
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="ext-source">Source</label>
                  <input id="ext-source" className={INPUT_CLS} value={externalData?.source ?? ''} onChange={(e) => updateExternalFramework({ source: e.target.value })} placeholder="e.g., OpenCASE, State Standards" />
                  <div className={HINT_CLS}>Where this framework comes from.</div>
                </div>
              </div>
            </SidebarSection>

            <SidebarSection title="Description" subtitle="Notes about this external reference." accentColor="#d97706">
              <textarea id="ext-description" rows={4} className={`${INPUT_CLS} resize-y`} value={externalData?.description ?? ''} onChange={(e) => updateExternalFramework({ description: e.target.value })} placeholder="Add notes about this external framework..." />
            </SidebarSection>

            <SidebarSection title="Appearance" subtitle="Color used on the canvas and link bars." accentColor={externalData?.color ?? '#d97706'}>
              <ColorBandPicker
                value={externalData?.color}
                onChange={(color) => updateExternalFramework({ color: color ?? externalData?.color ?? '#64748b' })}
                label="Theme color"
                labelClassName={LABEL_CLS}
              />
            </SidebarSection>

            {externalData?.cgeFrameworkId ? (
              <SidebarSection title="Cache" subtitle="Read-only copy stored in OpenCASE for browsing and linking." accentColor={externalData?.color ?? '#d97706'}>
                <div className="space-y-3 text-sm text-slate-600">
                  {externalData.cacheError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
                      <div className="font-medium">Could not download framework</div>
                      <div className="mt-1 text-xs leading-relaxed text-rose-700">{externalData.cacheError}</div>
                      <div className="mt-2 text-xs text-rose-600">
                        Try enabling &quot;Open publisher (no auth)&quot; below, then download again.
                      </div>
                    </div>
                  ) : null}
                  {externalData.cacheLoading ? (
                    <div className="text-sm text-slate-500">Downloading from publisher…</div>
                  ) : null}
                  {!externalData.cacheDocId && !externalData.cacheError && !externalData.cacheLoading ? (
                    <div className="text-sm text-slate-500">No cached copy yet. Download to browse items and create links.</div>
                  ) : null}
                  {externalData.itemCount != null ? (
                    <div>{externalData.itemCount} items cached</div>
                  ) : null}
                  {externalData.cachedAt ? (
                    <div>Last refreshed: {formatDateTime(externalData.cachedAt)}</div>
                  ) : null}
                  {externalData.cacheDocId ? (
                    <div className="font-mono text-xs text-slate-500">Doc: {externalData.cacheDocId}</div>
                  ) : null}
                  <div className="rounded-xl border border-black/10 bg-white p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="ext-skip-publisher-auth"
                        checked={Boolean(externalData.skipPublisherAuth)}
                        onCheckedChange={(v: CheckedState) => updateExternalFramework({ skipPublisherAuth: Boolean(v) })}
                      />
                      <div className="grid gap-1">
                        <Label htmlFor="ext-skip-publisher-auth" className="text-sm font-medium text-slate-900">
                          Open publisher (no auth)
                        </Label>
                        <div className={HINT_CLS}>
                          Skip the CGE bearer token when refreshing from the publisher. Use when the framework is publicly accessible but rejects CASE Global credentials.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {onBrowseRemoteItems && node && externalData.cacheDocId ? (
                      <Button type="button" variant="secondary" size="sm" onClick={() => onBrowseRemoteItems(node.id)}>
                        Browse items
                      </Button>
                    ) : null}
                    {onRefreshRemoteFramework ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={remoteFrameworkRefreshing || externalData.cacheLoading}
                        onClick={() => void onRefreshRemoteFramework()}
                      >
                        <ArrowPathIcon className={`mr-1.5 h-4 w-4 ${remoteFrameworkRefreshing || externalData.cacheLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        {remoteFrameworkRefreshing || externalData.cacheLoading
                          ? 'Downloading…'
                          : externalData.cacheDocId
                            ? 'Refresh cache'
                            : 'Download cache'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </SidebarSection>
            ) : null}

            <SidebarSection title="Actions" subtitle="Manage this remote framework on the canvas." accentColor={externalData?.color ?? '#d97706'} defaultOpen={false}>
              {onRemoveRemoteFramework && node ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => onRemoveRemoteFramework(node.id)}>
                  Remove from canvas
                </Button>
              ) : null}
            </SidebarSection>

            <div className="mx-4 my-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-amber-900">About external frameworks</div>
                <div className="mt-1 text-sm text-amber-700">
                  External frameworks represent references to standards or frameworks outside of this document.
                  Connect items using &quot;Is Part Of&quot; associations to indicate alignment.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : node ? (
        <div className="flex-1 overflow-auto px-2 py-3">
          <div className="space-y-1">

            {/* ── Description / Statement ── */}
            <SidebarSection
              title={isFramework ? 'Description' : 'Statement'}
              subtitle={isFramework ? 'What this framework is about.' : 'The main description of this item.'}
              accentColor={accentColor}
              defaultOpen
            >
              <textarea
                id="node-fullStatement"
                rows={5}
                className={`${INPUT_CLS} resize-y`}
                value={isFramework ? cfDocument?.description ?? '' : cfItem?.fullStatement ?? ''}
                onChange={(e) => (isFramework ? updateDocument({ description: e.target.value }) : updateItem({ fullStatement: e.target.value }))}
              />
            </SidebarSection>

            {/* ── About ── */}
            <SidebarSection
              title={isFramework ? 'About this framework' : 'About this item'}
              subtitle={isFramework ? 'Key details and classification.' : 'Helps people find and organise items.'}
              accentColor={accentColor}
              defaultOpen
            >
              {isFramework ? (
                /* ── Framework fields — single column ── */
                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-fw-title">Title</label>
                    <input id="node-fw-title" className={INPUT_CLS} value={cfDocument?.title ?? ''} onChange={(e) => updateDocument({ title: e.target.value })} placeholder="Framework title" />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-fw-creator">Creator</label>
                    <input id="node-fw-creator" className={INPUT_CLS} value={cfDocument?.creator ?? ''} onChange={(e) => updateDocument({ creator: e.target.value })} placeholder="Who authored this framework" />
                    <div className={HINT_CLS}>The entity with authority over the framework.</div>
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-fw-publisher">Publisher</label>
                    <input id="node-fw-publisher" className={INPUT_CLS} value={cfDocument?.publisher ?? ''} onChange={(e) => updateDocument({ publisher: e.target.value })} placeholder="Who distributes this framework" />
                    <div className={HINT_CLS}>The entity that makes this framework available.</div>
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-fw-type">Framework type</label>
                    <input id="node-fw-type" className={INPUT_CLS} value={cfDocument?.frameworkType ?? ''} onChange={(e) => updateDocument({ frameworkType: e.target.value })} placeholder="e.g., K-12, Workforce, CourseCodes" />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-fw-status">Adoption status</label>
                    <ComboboxInput id="node-fw-status" value={cfDocument?.adoptionStatus ?? ''} onChange={(v) => updateDocument({ adoptionStatus: v })} options={ADOPTION_STATUS_OPTIONS} placeholder="Select or type a status" className="w-full" />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-fw-language">Language</label>
                    <input id="node-fw-language" className={INPUT_CLS} value={cfDocument?.language ?? ''} onChange={(e) => updateDocument({ language: e.target.value })} placeholder="e.g., en, fr, es" />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-fw-subject">Subject(s)</label>
                    <TagComboboxInput
                      id="node-fw-subject"
                      values={cfDocument?.subject ?? []}
                      onChange={(vals) => { updateDocument({ subject: vals }); if (vals.length === 0) updateDocument({ subjectURI: undefined }) }}
                      onCommit={(addedValue) => {
                        const subDef = ensureCfSubject?.(addedValue)
                        if (subDef) {
                          const currentSubjects = cfDocument?.subject ?? []
                          const allSubjects = currentSubjects.includes(addedValue) ? currentSubjects : [...currentSubjects, addedValue]
                          const uris = allSubjects
                            .map((s) => { const def = ensureCfSubject?.(s); return def ? { title: def.title ?? '', identifier: def.identifier, uri: def.uri } : null })
                            .filter((u): u is NonNullable<typeof u> => u !== null)
                          updateDocument({ subjectURI: uris.length > 0 ? uris : undefined })
                        }
                      }}
                      options={cfSubjectOptions}
                      placeholder="Select or type subjects…"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-fw-source-url">Official source URL</label>
                    <input id="node-fw-source-url" className={`${INPUT_CLS} font-mono text-sm`} value={cfDocument?.officialSourceURL ?? ''} onChange={(e) => updateDocument({ officialSourceURL: e.target.value })} placeholder="https://…" />
                    <div className={HINT_CLS}>Link to the authoritative source for this framework.</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS} htmlFor="node-fw-start-date">Start date</label>
                      <input id="node-fw-start-date" type="date" className={INPUT_CLS} value={cfDocument?.statusStartDate ?? ''} onChange={(e) => updateDocument({ statusStartDate: e.target.value || undefined })} />
                    </div>
                    <div>
                      <label className={LABEL_CLS} htmlFor="node-fw-end-date">End date</label>
                      <input id="node-fw-end-date" type="date" className={INPUT_CLS} value={cfDocument?.statusEndDate ?? ''} onChange={(e) => updateDocument({ statusEndDate: e.target.value || undefined })} />
                    </div>
                  </div>
                  {cfDocument?.version ? (
                    <div>
                      <div className="text-sm font-medium text-slate-700">Version</div>
                      <div className="mt-1 text-base text-slate-600">{cfDocument.version}</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* ── Item fields — single column ── */
                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-humanCodingScheme">Code</label>
                    <div className="flex gap-2">
                      <input id="node-humanCodingScheme" className={INPUT_CLS} value={cfItem?.humanCodingScheme ?? ''} onChange={(e) => updateItem({ humanCodingScheme: e.target.value })} placeholder="e.g., 3.NBT.A.2" />
                      <Button variant="secondary" size="xs" disabled={!cfItem?.humanCodingScheme} onClick={() => { if (cfItem?.humanCodingScheme) void copyToClipboard(cfItem.humanCodingScheme, 'code') }} title="Copy code">
                        {copied === 'code' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-type">Type</label>
                    <ComboboxInput
                      id="node-type"
                      value={cfItem?.CFItemType ?? ''}
                      onChange={(v) => { updateItem({ CFItemType: v }); if (!v) updateItem({ CFItemTypeURI: undefined }) }}
                      onCommit={(v) => {
                        if (!v.trim()) { updateItem({ CFItemType: '', CFItemTypeURI: undefined }); return }
                        const typeDef = ensureCfItemType?.(v)
                        if (typeDef) { updateItem({ CFItemType: v, CFItemTypeURI: { title: typeDef.title ?? '', identifier: typeDef.identifier, uri: typeDef.uri } }) }
                      }}
                      options={cfItemTypeOptions}
                      placeholder="Select or type a type…"
                      className="w-full"
                    />
                  </div>
                  <ColorBandPicker value={cfItem?.colorBand} onChange={(color) => updateItem({ colorBand: color ?? '' })} labelClassName={LABEL_CLS} />
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-subject">Subject(s)</label>
                    <TagComboboxInput
                      id="node-subject"
                      values={cfItem?.subject ?? []}
                      onChange={(vals) => { updateItem({ subject: vals }); if (vals.length === 0) updateItem({ subjectURI: undefined }) }}
                      onCommit={(addedValue) => {
                        const subDef = ensureCfSubject?.(addedValue)
                        if (subDef) {
                          const currentSubjects = cfItem?.subject ?? []
                          const allSubjects = currentSubjects.includes(addedValue) ? currentSubjects : [...currentSubjects, addedValue]
                          const uris = allSubjects
                            .map((s) => { const def = ensureCfSubject?.(s); return def ? { title: def.title ?? '', identifier: def.identifier, uri: def.uri } : null })
                            .filter((u): u is NonNullable<typeof u> => u !== null)
                          updateItem({ subjectURI: uris.length > 0 ? uris : undefined })
                        }
                      }}
                      options={cfSubjectOptions}
                      placeholder="Select or type subjects…"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-educationLevel">Education level(s)</label>
                    <TagComboboxInput
                      id="node-educationLevel"
                      values={cfItem?.educationLevel ?? []}
                      onChange={(vals) => updateItem({ educationLevel: vals })}
                      options={educationLevelOptions}
                      placeholder="Select or type levels…"
                      className="w-full"
                      tagClassName="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-alternativeLabel">Short label</label>
                    <input id="node-alternativeLabel" className={INPUT_CLS} value={cfItem?.alternativeLabel ?? ''} onChange={(e) => updateItem({ alternativeLabel: e.target.value })} placeholder="A short, human-friendly title" />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-abbreviatedStatement">Abbreviated statement</label>
                    <input id="node-abbreviatedStatement" className={INPUT_CLS} value={cfItem?.abbreviatedStatement ?? ''} onChange={(e) => updateItem({ abbreviatedStatement: e.target.value })} placeholder="Shortened version of the full statement" />
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-listEnumeration">List enumeration</label>
                    <input id="node-listEnumeration" className={INPUT_CLS} value={cfItem?.listEnumeration ?? ''} onChange={(e) => updateItem({ listEnumeration: e.target.value })} placeholder="e.g., 1, 1.1, a" />
                    <div className={HINT_CLS}>Ordering hint for display purposes.</div>
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-language">Language</label>
                    <input id="node-language" className={INPUT_CLS} value={cfItem?.language ?? ''} onChange={(e) => updateItem({ language: e.target.value })} placeholder="e.g., en, fr, es" />
                    <div className={HINT_CLS}>Override the document-level language for this item.</div>
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-concept">Concept</label>
                    <ComboboxInput
                      id="node-concept"
                      value={conceptInput}
                      onChange={(v) => { setConceptInput(v); if (!v) updateItem({ conceptKeywordsURI: undefined }) }}
                      onCommit={(v) => {
                        if (!v.trim()) { setConceptInput(''); updateItem({ conceptKeywordsURI: undefined }); return }
                        const conceptDef = ensureCfConcept?.(v)
                        if (conceptDef) { setConceptInput(conceptDef.title ?? v); updateItem({ conceptKeywordsURI: { title: conceptDef.title ?? '', identifier: conceptDef.identifier, uri: conceptDef.uri } }) }
                      }}
                      options={cfConceptOptions}
                      placeholder="Select or type a concept…"
                      className="w-full"
                    />
                    <div className={HINT_CLS}>Formal concept from a taxonomy (e.g., Bloom&apos;s).</div>
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor="node-keywords">Keywords</label>
                    <TagComboboxInput
                      id="node-keywords"
                      values={cfItem?.conceptKeywords ?? []}
                      onChange={(vals) => updateItem({ conceptKeywords: vals.length > 0 ? vals : undefined })}
                      options={[]}
                      placeholder="Type a keyword and press Enter…"
                      className="w-full"
                      tagClassName="inline-flex items-center gap-0.5 rounded-full border border-black/10 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                    />
                    <div className={HINT_CLS}>Press Enter or Tab to add each keyword.</div>
                  </div>
                </div>
              )}
            </SidebarSection>

            {/* ── Remote links (items only) ── */}
            {!isFramework && !isExternalFramework && itemRemoteLinks.length > 0 ? (
              <SidebarSection title="Remote links" subtitle="Associations to items in cached frameworks." accentColor={accentColor} defaultOpen>
                <div className="space-y-3">
                  {itemRemoteLinks.map((link) => (
                    <div key={link.id} className="rounded-xl border border-black/10 bg-white p-3">
                      <div className="flex items-start gap-2">
                        <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: link.remoteFrameworkColor ?? '#64748b' }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-500">{link.remoteFrameworkTitle ?? 'Remote framework'}</div>
                          <div className="truncate text-sm font-medium text-slate-900">
                            {link.remoteHumanCodingScheme ? (
                              <span className="font-mono text-xs text-slate-600">{link.remoteHumanCodingScheme}</span>
                            ) : null}
                            {link.remoteHumanCodingScheme && link.remoteLabel ? ' — ' : null}
                            {link.remoteLabel}
                          </div>
                          <div className="mt-2">
                            <label className="sr-only" htmlFor={`remote-link-type-${link.id}`}>Association type</label>
                            <select
                              id={`remote-link-type-${link.id}`}
                              className={INPUT_CLS}
                              value={link.associationType}
                              onChange={(e) => onUpdateRemoteLinkType?.(link.id, e.target.value)}
                            >
                              {CASE_ASSOCIATION_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="mt-2 w-full text-rose-700 hover:text-rose-800" onClick={() => onRemoveRemoteLink?.(link.id)}>
                        Remove link
                      </Button>
                    </div>
                  ))}
                </div>
              </SidebarSection>
            ) : null}

            {/* ── Item lifecycle (items only) ── */}
            {!isFramework && !isExternalFramework && cfItem ? (
              <SidebarSection title="Lifecycle" subtitle="Validity dates and license for this item." accentColor={accentColor} defaultOpen={false}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS} htmlFor="node-item-start-date">Start date</label>
                      <input id="node-item-start-date" type="date" className={INPUT_CLS} value={cfItem.statusStartDate ?? ''} onChange={(e) => updateItem({ statusStartDate: e.target.value || undefined })} />
                    </div>
                    <div>
                      <label className={LABEL_CLS} htmlFor="node-item-end-date">End date</label>
                      <input id="node-item-end-date" type="date" className={INPUT_CLS} value={cfItem.statusEndDate ?? ''} onChange={(e) => updateItem({ statusEndDate: e.target.value || undefined })} />
                    </div>
                  </div>
                  {availableLicenses && availableLicenses.length > 0 ? (
                    <div>
                      <label className={LABEL_CLS} htmlFor="node-item-license">License</label>
                      <select
                        id="node-item-license"
                        className={INPUT_CLS}
                        value={cfItem.licenseURI?.identifier ?? ''}
                        onChange={(e) => {
                          const selectedId = e.target.value
                          if (!selectedId) { updateItem({ licenseURI: undefined }); return }
                          const lic = availableLicenses.find((l) => l.identifier === selectedId)
                          if (lic) { updateItem({ licenseURI: { title: lic.title, identifier: lic.identifier, uri: lic.uri } }) }
                        }}
                      >
                        <option value="">Inherit from framework</option>
                        {availableLicenses.map((lic) => (
                          <option key={lic.identifier} value={lic.identifier}>{lic.title}</option>
                        ))}
                      </select>
                      <div className={HINT_CLS}>Override the framework license for this item.</div>
                    </div>
                  ) : null}
                </div>
              </SidebarSection>
            ) : null}

            {/* ── License (framework only) ── */}
            {isFramework && availableLicenses && availableLicenses.length > 0 ? (
              <SidebarSection title="License" subtitle="Choose who can use this framework and how." accentColor={accentColor} defaultOpen>
                <div className="space-y-3">
                  <select
                    id="node-license"
                    className={INPUT_CLS}
                    value={cfDocument?.licenseURI?.identifier ?? ''}
                    onChange={(e) => {
                      const selectedId = e.target.value
                      if (!selectedId) { updateDocument({ licenseURI: undefined }); return }
                      const lic = availableLicenses.find((l) => l.identifier === selectedId)
                      if (lic) { updateDocument({ licenseURI: { title: lic.title, identifier: lic.identifier, uri: lic.uri } }) }
                    }}
                  >
                    <option value="">No license selected</option>
                    {availableLicenses.map((lic) => (
                      <option key={lic.identifier} value={lic.identifier}>{lic.title}</option>
                    ))}
                  </select>
                  {cfDocument?.licenseURI?.identifier ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                      {availableLicenses.find((l) => l.identifier === cfDocument?.licenseURI?.identifier)?.description ?? 'License details not available.'}
                    </div>
                  ) : null}
                </div>
              </SidebarSection>
            ) : null}

            {/* ── Notes ── */}
            <SidebarSection title="Notes" subtitle="Optional context for your team." accentColor={accentColor} defaultOpen={false}>
              <textarea
                id="node-notes"
                rows={4}
                className={`${INPUT_CLS} resize-y`}
                value={isFramework ? cfDocument?.notes ?? '' : cfItem?.notes ?? ''}
                onChange={(e) => (isFramework ? updateDocument({ notes: e.target.value }) : updateItem({ notes: e.target.value }))}
              />
            </SidebarSection>

            {/* ── Extensions ── */}
            <SidebarSection title="Extensions" subtitle="Custom fields" accentColor={accentColor} defaultOpen={false}>
              {Object.entries(isFramework ? cfDocument?.extensions ?? {} : cfItem?.extensions ?? {}).length ? (
                <div className="space-y-2">
                  {Object.entries(isFramework ? cfDocument?.extensions ?? {} : cfItem?.extensions ?? {}).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-black/10 bg-slate-50 p-3">
                      <div className="text-sm font-semibold text-slate-700">{k}</div>
                      <div className="mt-1 text-sm text-slate-900">
                        {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v == null ? (
                          <span className="font-mono">{String(v)}</span>
                        ) : (
                          <pre className="max-h-44 overflow-auto rounded-md bg-white p-2 font-mono text-xs text-slate-900">{JSON.stringify(v, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No custom fields yet.</div>
              )}
            </SidebarSection>

            {/* ── Export (framework only) ── */}
            {isFramework && onViewCFPackage ? (
              <SidebarSection title="Export" subtitle="CASE CFPackage for validation or sharing." accentColor={accentColor} defaultOpen={false}>
                <Button variant="secondary" onClick={onViewCFPackage} className="w-full">
                  View CFPackage JSON
                </Button>
              </SidebarSection>
            ) : null}

            {/* ── OpenCASE URL (framework only) ── */}
            {isFramework && isPublishedToOpenCase && opencaseUrl ? (
              <SidebarSection title="OpenCASE URL" subtitle="The CASE API endpoint for this framework." accentColor={accentColor} defaultOpen={false}>
                <div className="flex items-stretch gap-2">
                  <a
                    href={opencaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2.5 font-mono text-sm text-blue-800 hover:bg-blue-50 hover:underline break-all"
                    title="Open in new tab"
                  >
                    {opencaseUrl}
                  </a>
                  <Button variant="secondary" size="xs" onClick={() => void copyToClipboard(opencaseUrl, 'opencase')} title="Copy URL" className="shrink-0 self-center">
                    {copied === 'opencase' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </SidebarSection>
            ) : null}

            {/* ── Technical details ── */}
            <SidebarSection title="Technical details" subtitle="IDs, links, raw fields" accentColor={accentColor} defaultOpen={false}>
              <div className="rounded-lg border border-black/10 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-700">IDs and links</div>
                  {cfItem?.uri ? (
                    <Button variant="secondary" size="xs" onClick={() => { if (cfItem?.uri) void copyToClipboard(cfItem.uri, 'uri') }} title="Copy URI">
                      {copied === 'uri' ? 'Copied' : 'Copy URI'}
                    </Button>
                  ) : null}
                </div>
                {(
                  [
                    ['Identifier', cfItem?.identifier ?? cfDocument?.identifier],
                    ['URI', cfItem?.uri ?? cfDocument?.uri],
                    ['CFDocumentURI', cfItem?.CFDocumentURI?.uri],
                    ['Type URI', cfItem?.CFItemTypeURI?.uri],
                    ['Subject URI(s)', cfItem?.subjectURI?.map((s) => s.uri).join(', ')],
                    ['Keywords URI', cfItem?.conceptKeywordsURI?.uri],
                    ['License URI', (cfItem?.licenseURI ?? cfDocument?.licenseURI)?.uri],
                    ['Language', cfItem?.language ?? cfDocument?.language],
                    ['List enumeration', cfItem?.listEnumeration],
                    ['Abbreviated statement', cfItem?.abbreviatedStatement],
                    ['Status start date', cfItem?.statusStartDate ?? cfDocument?.statusStartDate],
                    ['Status end date', cfItem?.statusEndDate ?? cfDocument?.statusEndDate],
                    ['Last change', formatDateTime(cfItem?.lastChangeDateTime ?? cfDocument?.lastChangeDateTime)],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[140px_1fr] gap-2 border-b border-black/5 py-1.5 last:border-b-0">
                      <div className="text-xs text-slate-500">{k}</div>
                      <div className="wrap-break-word font-mono text-xs text-slate-900">{String(v)}</div>
                    </div>
                  ))}
              </div>
            </SidebarSection>

          </div>
        </div>
      ) : null}
    </aside>
  )
})
