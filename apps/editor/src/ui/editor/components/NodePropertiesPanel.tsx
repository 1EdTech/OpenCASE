import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
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
import type { CFDocument, CFItem, CFLicense } from '@/domain/case/types'
import type { ComboboxOption } from '@/ui/shared/components/ui/combobox-input'
import { useEditor } from '@/ui/editor/state/EditorContext'
import { EDUCATION_LEVEL_OPTIONS } from '@/ui/editor/terminology/educationLevels'
import type { EducationLevelOption } from '@/ui/editor/terminology/educationLevels'
import { getAppConfig } from '@/app/config'
import ColorBandPicker from '@/ui/editor/components/ColorBandPicker'

type Props = {
  node: CaseEditorNodeType | null
  onClose?: () => void
  onChangeNode?: (_nodeId: string, _patch: CaseEditorNodeDataPatch) => void
  /** Callback to open the CFPackage viewer (framework node only) */
  onViewCFPackage?: () => void
  /** Whether the current framework has been published to OpenCASE */
  isPublishedToOpenCase?: boolean
  /** Available license options fetched from OpenCASE */
  availableLicenses?: CFLicense[]
}

export default function NodePropertiesPanel({ node, onClose, onChangeNode, onViewCFPackage, isPublishedToOpenCase, availableLicenses }: Readonly<Props>) {
  const { cfItemTypes, ensureCfItemType, cfSubjects, ensureCfSubject, cfConcepts, ensureCfConcept } = useEditor()
  const [copied, setCopied] = useState<null | 'code' | 'uri' | 'opencase'>(null)
  // Local state for the concept combobox input text (conceptKeywordsURI is a LinkURI, not a plain string)
  const [conceptInput, setConceptInput] = useState('')
  useEffect(() => {
    if (!node) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }

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

  // Sync concept input with selected node's conceptKeywordsURI title
  useEffect(() => {
    setConceptInput(cfItem?.conceptKeywordsURI?.title ?? '')
  }, [node?.id, cfItem?.conceptKeywordsURI?.title])

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  }

  const metaRows = useMemo(() => {
    if (!node) return []
    return [
      ['Parent item', isItemNode(node) ? node.data.parentId ?? '—' : '—'],
      ['Last updated', formatDateTime(cfItem?.lastChangeDateTime)],
    ] as const
  }, [node, cfItem?.lastChangeDateTime])

  /** Deduplicate options by value (title). First occurrence wins. */
  const dedup = <T extends { value: string }>(arr: T[]): T[] => {
    const seen = new Set<string>()
    return arr.filter((o) => {
      if (seen.has(o.value)) return false
      seen.add(o.value)
      return true
    })
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

  const parseCsv = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const joinCsv = (arr?: string[]) => (arr?.length ? arr.join(', ') : '')

  const copyToClipboard = async (text: string, kind: 'code' | 'uri' | 'opencase') => {
    try {
      await globalThis.navigator?.clipboard?.writeText(text)
      setCopied(kind)
      globalThis.setTimeout(() => setCopied(null), 1200)
    } catch {
      // best-effort; ignore
    }
  }

  // Compute the full OpenCASE CFPackage URL for published frameworks
  const opencaseUrl = useMemo(() => {
    if (!cfDocument?.identifier) return null
    try {
      const { opencaseBaseUrl } = getAppConfig()
      // Build the standard CASE API path from the document identifier
      const base = opencaseBaseUrl.replace(/\/+$/, '')
      return `${base}/ims/case/v1p1/CFPackages/${cfDocument.identifier}`
    } catch {
      return null
    }
  }, [cfDocument?.identifier])

  const isOpen = Boolean(node)

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-20 flex h-screen w-[min(460px,92vw)] flex-col border-l border-black/10 bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-[-16px_0_40px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      aria-label={isExternalFramework ? 'External framework details' : isFramework ? 'Framework details' : 'Item details'}
    >
      <div className="flex items-center justify-between border-b border-black/10 bg-white/70 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-sm font-bold">
            {isExternalFramework ? 'External framework' : isFramework ? 'Framework details' : 'Item details'}
          </div>
          <div className="text-xs text-slate-500">
            {isExternalFramework 
              ? 'Reference to an external framework or standards document.'
              : isFramework 
                ? 'High-level information about this framework.' 
                : 'Select a card on the canvas to view and edit.'}
          </div>
        </div>
        <Button variant="secondary" size="xs" onClick={() => onClose?.()}>
          Close
        </Button>
      </div>

      {node && isExternalFramework ? (
        // External Framework Panel
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-700">External Reference</div>
                <div className="text-base font-semibold text-amber-900">
                  {externalData?.title || 'Untitled external framework'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">Basic Information</div>
                <div className="text-xs text-slate-500">Details about this external framework reference.</div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="ext-title">
                    Title
                  </label>
                  <input
                    id="ext-title"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    value={externalData?.title ?? ''}
                    onChange={(e) => updateExternalFramework({ title: e.target.value })}
                    placeholder="e.g., Common Core State Standards"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="ext-uri">
                    URI / Identifier
                  </label>
                  <input
                    id="ext-uri"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    value={externalData?.uri ?? ''}
                    onChange={(e) => updateExternalFramework({ uri: e.target.value })}
                    placeholder="e.g., urn:case:framework:ccss-math"
                  />
                  <div className="mt-1 text-xs text-slate-500">The unique identifier or URI for this framework.</div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="ext-source">
                    Source
                  </label>
                  <input
                    id="ext-source"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    value={externalData?.source ?? ''}
                    onChange={(e) => updateExternalFramework({ source: e.target.value })}
                    placeholder="e.g., OpenCASE, State Standards"
                  />
                  <div className="mt-1 text-xs text-slate-500">Where this framework comes from.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-2">
                <div className="text-sm font-semibold text-slate-900">Description</div>
                <div className="text-xs text-slate-500">Notes about this external framework reference.</div>
              </div>
              <textarea
                id="ext-description"
                rows={4}
                className="w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                value={externalData?.description ?? ''}
                onChange={(e) => updateExternalFramework({ description: e.target.value })}
                placeholder="Add notes about this external framework..."
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-amber-900">About External Frameworks</div>
                  <div className="mt-1 text-xs text-amber-700">
                    External frameworks represent references to standards or frameworks outside of this document. 
                    Connect items to this node using "Is Part Of" associations to indicate alignment or relationships.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : node ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-2">
              <div className="text-xs font-semibold text-slate-700">{isFramework ? 'Framework' : 'Item'}</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {isFramework
                  ? cfDocument?.title ?? 'Untitled framework'
                  : cfItem?.humanCodingScheme ?? cfItem?.alternativeLabel ?? 'Untitled item'}
              </div>
              {isFramework && cfDocument?.licenseURI?.title ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1.5V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
                    </svg>
                    {cfDocument.licenseURI.title}
                  </span>
                </div>
              ) : null}
              {!isFramework && (cfItem?.CFItemType || cfItem?.subject?.[0] || cfItem?.educationLevel?.[0]) ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cfItem?.CFItemType ? (
                    <span className="rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {cfItem.CFItemType}
                    </span>
                  ) : null}
                  {cfItem?.subject?.[0] ? (
                    <span className="rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {cfItem.subject[0]}
                    </span>
                  ) : null}
                  {cfItem?.educationLevel?.[0] ? (
                    <span className="rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {cfItem.educationLevel[0]}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {metaRows.map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[110px_1fr] gap-2 border-b border-black/5 py-1 last:border-b-0"
              >
                <div className="text-xs text-slate-600">{k}</div>
                <div className="wrap-break-word text-xs text-slate-900">{String(v)}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-2">
                <div className="text-sm font-semibold text-slate-900">{isFramework ? 'Description' : 'Statement'}</div>
                <div className="text-xs text-slate-500">
                  {isFramework ? 'What this framework is about.' : 'The main description of this item.'}
                </div>
              </div>
              <textarea
                id="node-fullStatement"
                rows={6}
                className="w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                value={isFramework ? cfDocument?.description ?? '' : cfItem?.fullStatement ?? ''}
                onChange={(e) => (isFramework ? updateDocument({ description: e.target.value }) : updateItem({ fullStatement: e.target.value }))}
              />
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900">{isFramework ? 'About this framework' : 'About this item'}</div>
                <div className="text-xs text-slate-500">
                  {isFramework ? 'High-level details for the framework.' : 'Helps people find and organize items.'}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-humanCodingScheme">
                    {isFramework ? 'Title' : 'Code'}
                  </label>
                  {isFramework ? (
                    <input
                      id="node-humanCodingScheme"
                      className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                      value={cfDocument?.title ?? ''}
                      onChange={(e) => updateDocument({ title: e.target.value })}
                      placeholder="Framework title"
                    />
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          id="node-humanCodingScheme"
                          className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                          value={cfItem?.humanCodingScheme ?? ''}
                          onChange={(e) => updateItem({ humanCodingScheme: e.target.value })}
                        />
                        <Button
                          variant="secondary"
                          size="xs"
                          disabled={!cfItem?.humanCodingScheme}
                          onClick={() => {
                            if (!cfItem?.humanCodingScheme) return
                            void copyToClipboard(cfItem.humanCodingScheme, 'code')
                          }}
                          title="Copy code"
                        >
                          {copied === 'code' ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Example: 3.NBT.A.2</div>
                    </>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-type">
                    {isFramework ? 'Creator' : 'Type'}
                  </label>
                  {isFramework ? (
                    <input
                      id="node-type"
                      className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                      value={cfDocument?.creator ?? ''}
                      onChange={(e) => updateDocument({ creator: e.target.value })}
                      placeholder="Who authored this framework"
                    />
                  ) : (
                    <ComboboxInput
                      id="node-type"
                      value={cfItem?.CFItemType ?? ''}
                      onChange={(v) => updateItem({ CFItemType: v })}
                      onCommit={(v) => {
                        const typeDef = ensureCfItemType(v)
                        if (typeDef) {
                          updateItem({
                            CFItemType: v,
                            CFItemTypeURI: { title: typeDef.title ?? '', identifier: typeDef.identifier, uri: typeDef.uri },
                          })
                        }
                      }}
                      options={cfItemTypeOptions}
                      placeholder="Select or type a type…"
                      className="w-full"
                    />
                  )}
                </div>

                {!isFramework ? (
                  <ColorBandPicker
                    value={cfItem?.colorBand}
                    onChange={(color) => updateItem({ colorBand: color ?? '' })}
                  />
                ) : null}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-subject">
                    {isFramework ? 'Framework type' : 'Subject(s)'}
                  </label>
                  {isFramework ? (
                    <input
                      id="node-subject"
                      className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                      value={cfDocument?.frameworkType ?? ''}
                      onChange={(e) => updateDocument({ frameworkType: e.target.value })}
                      placeholder="Example: K-12"
                    />
                  ) : (
                    <TagComboboxInput
                      id="node-subject"
                      values={cfItem?.subject ?? []}
                      onChange={(vals) => updateItem({ subject: vals })}
                      onCommit={(addedValue) => {
                        const subDef = ensureCfSubject(addedValue)
                        if (subDef) {
                          // Rebuild the full subjectURI array from current subjects + the new one
                          const currentSubjects = cfItem?.subject ?? []
                          const allSubjects = currentSubjects.includes(addedValue) ? currentSubjects : [...currentSubjects, addedValue]
                          const uris = allSubjects
                            .map((s) => {
                              const def = ensureCfSubject(s)
                              return def ? { title: def.title ?? '', identifier: def.identifier, uri: def.uri } : null
                            })
                            .filter((u): u is NonNullable<typeof u> => u !== null)
                          updateItem({ subjectURI: uris.length > 0 ? uris : undefined })
                        }
                      }}
                      options={cfSubjectOptions}
                      placeholder="Select or type subjects…"
                      className="w-full"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-educationLevel">
                    {isFramework ? 'Adoption status' : 'Education level(s)'}
                  </label>
                  {isFramework ? (
                    <ComboboxInput
                      id="node-educationLevel"
                      value={cfDocument?.adoptionStatus ?? ''}
                      onChange={(v) => updateDocument({ adoptionStatus: v })}
                      options={ADOPTION_STATUS_OPTIONS}
                      placeholder="Select or type a status"
                      className="w-full"
                    />
                  ) : (
                    <TagComboboxInput
                      id="node-educationLevel"
                      values={cfItem?.educationLevel ?? []}
                      onChange={(vals) => updateItem({ educationLevel: vals })}
                      options={educationLevelOptions}
                      placeholder="Select or type levels…"
                      className="w-full"
                    />
                  )}
                </div>

                {!isFramework ? (
                  <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-alternativeLabel">
                    Short label
                  </label>
                  <input
                    id="node-alternativeLabel"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    value={cfItem?.alternativeLabel ?? ''}
                    onChange={(e) => updateItem({ alternativeLabel: e.target.value })}
                    placeholder="A short, human-friendly title"
                  />
                  </div>
                ) : null}

                {!isFramework ? (
                  <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-concept">
                    Concept
                  </label>
                  <ComboboxInput
                    id="node-concept"
                    value={conceptInput}
                    onChange={(v) => {
                      setConceptInput(v)
                      if (!v) {
                        updateItem({ conceptKeywordsURI: undefined })
                      }
                    }}
                    onCommit={(v) => {
                      if (!v.trim()) {
                        setConceptInput('')
                        updateItem({ conceptKeywordsURI: undefined })
                        return
                      }
                      const conceptDef = ensureCfConcept(v)
                      if (conceptDef) {
                        setConceptInput(conceptDef.title ?? v)
                        updateItem({
                          conceptKeywordsURI: { title: conceptDef.title ?? '', identifier: conceptDef.identifier, uri: conceptDef.uri },
                        })
                      }
                    }}
                    options={cfConceptOptions}
                    placeholder="Select or type a concept…"
                    className="w-full"
                  />
                  <div className="mt-1 text-xs text-slate-500">Formal concept from a taxonomy (e.g., Bloom&apos;s).</div>
                  </div>
                ) : null}

                {!isFramework ? (
                  <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-keywords">
                    Keywords
                  </label>
                  <input
                    id="node-keywords"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    value={joinCsv(cfItem?.conceptKeywords)}
                    onChange={(e) => updateItem({ conceptKeywords: parseCsv(e.target.value) })}
                    placeholder="e.g., rounding, place value"
                  />
                  <div className="mt-1 text-xs text-slate-500">Tip: separate with commas.</div>
                  {(cfItem?.conceptKeywords?.length ?? 0) > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cfItem!.conceptKeywords!.slice(0, 8).map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {isFramework && availableLicenses && availableLicenses.length > 0 ? (
              <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="mb-2">
                  <div className="text-sm font-semibold text-slate-900">License</div>
                  <div className="text-xs text-slate-500">
                    Choose who can use this framework and how.
                  </div>
                </div>
                <select
                  id="node-license"
                  className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                  value={cfDocument?.licenseURI?.identifier ?? ''}
                  onChange={(e) => {
                    const selectedId = e.target.value
                    if (!selectedId) {
                      updateDocument({ licenseURI: undefined })
                      return
                    }
                    const lic = availableLicenses.find((l) => l.identifier === selectedId)
                    if (lic) {
                      updateDocument({
                        licenseURI: {
                          title: lic.title,
                          identifier: lic.identifier,
                          uri: lic.uri,
                        },
                      })
                    }
                  }}
                >
                  <option value="">No license selected</option>
                  {availableLicenses.map((lic) => (
                    <option key={lic.identifier} value={lic.identifier}>
                      {lic.title}
                    </option>
                  ))}
                </select>
                {cfDocument?.licenseURI?.identifier ? (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {availableLicenses.find((l) => l.identifier === cfDocument?.licenseURI?.identifier)?.description ??
                      'License details not available.'}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-2">
                <div className="text-sm font-semibold text-slate-900">Notes</div>
                <div className="text-xs text-slate-500">Optional context for your team.</div>
              </div>
              <textarea
                id="node-notes"
                rows={4}
                className="w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                value={isFramework ? cfDocument?.notes ?? '' : cfItem?.notes ?? ''}
                onChange={(e) => (isFramework ? updateDocument({ notes: e.target.value }) : updateItem({ notes: e.target.value }))}
              />
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Extensions</div>
                <div className="text-xs text-slate-500">Custom fields</div>
              </div>

              {Object.entries(isFramework ? cfDocument?.extensions ?? {} : cfItem?.extensions ?? {}).length ? (
                <div className="space-y-2">
                  {Object.entries(isFramework ? cfDocument?.extensions ?? {} : cfItem?.extensions ?? {}).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-black/10 bg-slate-900/2 p-2">
                      <div className="text-xs font-semibold text-slate-700">{k}</div>
                      <div className="mt-1 text-xs text-slate-900">
                        {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v == null ? (
                          <span className="font-mono">{String(v)}</span>
                        ) : (
                          <pre className="max-h-44 overflow-auto rounded-md bg-white p-2 font-mono text-[11px] text-slate-900">
                            {JSON.stringify(v, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  No custom fields yet. Extensions are useful for local tags, internal IDs, and alignment metadata.
                </div>
              )}
            </div>

            {isFramework && onViewCFPackage ? (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-violet-900">Export</div>
                  <div className="text-xs text-violet-700">
                    Export this framework as a CASE CFPackage for validation or sharing.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={onViewCFPackage}
                  className="w-full"
                >
                  View CFPackage JSON
                </Button>
              </div>
            ) : null}

            {isFramework && isPublishedToOpenCase && opencaseUrl ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <div className="text-sm font-semibold text-blue-900">OpenCASE URL</div>
                  </div>
                  <div className="mt-1 text-xs text-blue-700">
                    The CASE API endpoint for this framework on OpenCASE.
                  </div>
                </div>
                <div className="flex items-stretch gap-2">
                  <a
                    href={opencaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 font-mono text-xs text-blue-800 hover:bg-blue-50 hover:underline break-all"
                    title="Open in new tab"
                  >
                    {opencaseUrl}
                  </a>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => void copyToClipboard(opencaseUrl, 'opencase')}
                    title="Copy URL"
                    className="shrink-0 self-center"
                  >
                    {copied === 'opencase' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            ) : null}

            <details className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer select-none text-sm font-semibold text-slate-900">
                Technical details
                <span className="ml-2 text-xs font-normal text-slate-500">(IDs, links, raw fields)</span>
              </summary>

              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-black/10 bg-slate-900/2 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">IDs and links</div>
                    {cfItem?.uri ? (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          if (!cfItem?.uri) return
                          void copyToClipboard(cfItem.uri, 'uri')
                        }}
                        title="Copy URI"
                      >
                        {copied === 'uri' ? 'Copied' : 'Copy URI'}
                      </Button>
                    ) : null}
                  </div>
                  {(
                    [
                      ['Identifier', cfItem?.identifier],
                      ['URI', cfItem?.uri],
                      ['CFDocumentURI', cfItem?.CFDocumentURI?.uri],
                      ['Type URI', cfItem?.CFItemTypeURI?.uri],
                      ['Subject URI(s)', cfItem?.subjectURI?.map((s) => s.uri).join(', ')],
                      ['Keywords URI', cfItem?.conceptKeywordsURI?.uri],
                      ['License URI', cfItem?.licenseURI?.uri],
                      ['Language', cfItem?.language],
                      ['List enumeration', cfItem?.listEnumeration],
                      ['Abbreviated statement', cfItem?.abbreviatedStatement],
                      ['Status start date', cfItem?.statusStartDate],
                      ['Status end date', cfItem?.statusEndDate],
                      ['Last change', cfItem?.lastChangeDateTime],
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div
                        key={k}
                        className="grid grid-cols-[140px_1fr] gap-2 border-b border-black/5 py-1 last:border-b-0"
                      >
                        <div className="text-xs text-slate-600">{k}</div>
                        <div className="wrap-break-word font-mono text-xs text-slate-900">{String(v)}</div>
                      </div>
                    ))}

                  {!cfItem ? <div className="text-sm text-slate-600">No item selected.</div> : null}
                </div>
              </div>
            </details>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

