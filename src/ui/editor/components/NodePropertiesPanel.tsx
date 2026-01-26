import { useEffect, useMemo, useState } from 'react'
import type { Node } from '@xyflow/react'
import { Button } from '@/ui/shared/components/ui/button'
import type { CaseEditorNodeData, CaseEditorNodeDataPatch } from '../reactflow/types'
import type { CFDocument, CFItem } from '@/domain/case/types'

type Props = {
  node: Node<CaseEditorNodeData> | null
  onClose?: () => void
  onChangeNode?: (_nodeId: string, _patch: CaseEditorNodeDataPatch) => void
}

export default function NodePropertiesPanel({ node, onClose, onChangeNode }: Readonly<Props>) {
  const [copied, setCopied] = useState<null | 'code' | 'uri'>(null)
  useEffect(() => {
    if (!node) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [node, onClose])

  const nodeType = node?.type
  const cfItem = (node?.data as any)?.cfItem as CFItem | undefined
  const cfDocument = (node?.data as any)?.cfDocument as CFDocument | undefined
  const isFramework = nodeType === 'caseFrameworkNode'

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
      ['Parent item', node.data?.parentId ?? '—'],
      ['Last updated', formatDateTime(cfItem?.lastChangeDateTime)],
    ] as const
  }, [node, cfItem?.lastChangeDateTime])

  const updateItem = (patch: Partial<CFItem>) => {
    if (!node) return
    onChangeNode?.(node.id, { cfItem: { ...patch, lastChangeDateTime: new Date().toISOString() } })
  }

  const updateDocument = (patch: Partial<CFDocument>) => {
    if (!node) return
    onChangeNode?.(node.id, { cfDocument: { ...patch, lastChangeDateTime: new Date().toISOString() } })
  }

  const parseCsv = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const joinCsv = (arr?: string[]) => (arr?.length ? arr.join(', ') : '')

  const copyToClipboard = async (text: string, kind: 'code' | 'uri') => {
    try {
      await globalThis.navigator?.clipboard?.writeText(text)
      setCopied(kind)
      globalThis.setTimeout(() => setCopied(null), 1200)
    } catch {
      // best-effort; ignore
    }
  }

  const isOpen = Boolean(node)

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-20 flex h-screen w-[min(460px,92vw)] flex-col border-l border-black/10 bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-[-16px_0_40px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      aria-label={isFramework ? 'Framework details' : 'Item details'}
    >
      <div className="flex items-center justify-between border-b border-black/10 bg-white/70 px-4 py-3 backdrop-blur">
        <div>
          <div className="text-sm font-bold">{isFramework ? 'Framework details' : 'Item details'}</div>
          <div className="text-xs text-slate-500">
            {isFramework ? 'High-level information about this framework.' : 'Select a card on the canvas to view and edit.'}
          </div>
        </div>
        <Button variant="secondary" size="xs" onClick={() => onClose?.()}>
          Close
        </Button>
      </div>

      {node ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-2">
              <div className="text-xs font-semibold text-slate-700">{isFramework ? 'Framework' : 'Item'}</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {isFramework
                  ? cfDocument?.title ?? 'Untitled framework'
                  : cfItem?.humanCodingScheme ?? cfItem?.alternativeLabel ?? 'Untitled item'}
              </div>
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
                  <input
                    id="node-type"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    value={isFramework ? cfDocument?.creator ?? '' : cfItem?.CFItemType ?? ''}
                    onChange={(e) => (isFramework ? updateDocument({ creator: e.target.value }) : updateItem({ CFItemType: e.target.value }))}
                    placeholder={isFramework ? 'Who authored this framework' : 'Example: Standard'}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-subject">
                    {isFramework ? 'Framework type' : 'Subject(s)'}
                  </label>
                  <input
                    id="node-subject"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    value={isFramework ? cfDocument?.frameworkType ?? '' : joinCsv(cfItem?.subject)}
                    onChange={(e) =>
                      isFramework ? updateDocument({ frameworkType: e.target.value }) : updateItem({ subject: parseCsv(e.target.value) })
                    }
                    placeholder={isFramework ? 'Example: K-12' : 'Example: Mathematics, Algebra'}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-educationLevel">
                    {isFramework ? 'Adoption status' : 'Education level(s)'}
                  </label>
                  <input
                    id="node-educationLevel"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                    value={isFramework ? cfDocument?.adoptionStatus ?? '' : joinCsv(cfItem?.educationLevel)}
                    onChange={(e) =>
                      isFramework
                        ? updateDocument({ adoptionStatus: e.target.value })
                        : updateItem({ educationLevel: parseCsv(e.target.value) })
                    }
                    placeholder={isFramework ? 'Example: Draft' : 'Example: Grade 3'}
                  />
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

              {((isFramework ? cfDocument?.extensions : cfItem?.extensions) &&
                Object.keys((isFramework ? cfDocument!.extensions! : cfItem!.extensions!) as any).length) ? (
                <div className="space-y-2">
                  {Object.entries((isFramework ? cfDocument!.extensions! : cfItem!.extensions!) as any).map(([k, v]) => (
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

