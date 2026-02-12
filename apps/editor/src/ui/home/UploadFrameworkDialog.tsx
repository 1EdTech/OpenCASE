import { useCallback, useMemo, useRef, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/shared/components/ui/dialog'
import { Input } from '@/ui/shared/components/ui/input'
import { Label } from '@/ui/shared/components/ui/label'
import { ComboboxInput } from '@/ui/shared/components/ui/combobox-input'
import { ADOPTION_STATUS_OPTIONS } from '@/domain/framework/model/adoptionStatus'
import { ExclamationTriangleIcon, ArrowUpTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid'
import { parseSpreadsheetFile, type ParseResult } from '@/application/framework/services/SpreadsheetParser'
import { spreadsheetToFramework } from '@/application/framework/services/SpreadsheetToFramework'
import { downloadTemplate } from '@/ui/home/spreadsheetTemplate'
import type { Framework } from '@/domain/framework/model/types'

export default function UploadFrameworkDialog({
  open,
  onCancel,
  onUpload,
}: Readonly<{
  open: boolean
  onCancel: () => void
  onUpload: (_framework: Framework) => void
}>) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File & parse state
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [parsing, setParsing] = useState(false)

  // Framework metadata
  const [title, setTitle] = useState('')
  const [frameworkType, setFrameworkType] = useState('K-12')
  const [adoptionStatus, setAdoptionStatus] = useState('Draft')

  const hasErrors = (parseResult?.errors.length ?? 0) > 0
  const rowCount = parseResult?.rows.length ?? 0

  const canUpload = useMemo(
    () => title.trim().length > 0 && rowCount > 0 && !hasErrors && !parsing,
    [title, rowCount, hasErrors, parsing],
  )

  // Compute hierarchy depth for preview
  const maxLevel = useMemo(() => {
    if (!parseResult?.rows.length) return 0
    return Math.max(...parseResult.rows.map((r) => r.level))
  }, [parseResult])

  const handleFileChange = useCallback(async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null)
      setParseResult(null)
      return
    }

    setFile(selectedFile)
    setParsing(true)
    try {
      const result = await parseSpreadsheetFile(selectedFile)
      setParseResult(result)

      // Auto-fill title from filename if title is empty
      if (!title.trim()) {
        const name = selectedFile.name.replace(/\.(csv|xlsx|xls)$/i, '').replaceAll(/[-_]/g, ' ')
        setTitle(name)
      }
    } catch (e: unknown) {
      setParseResult({
        rows: [],
        errors: [{ message: e instanceof Error ? e.message : 'Failed to parse file.' }],
        warnings: [],
      })
    } finally {
      setParsing(false)
    }
  }, [title])

  const handleUpload = useCallback(() => {
    if (!canUpload || !parseResult) return

    const framework = spreadsheetToFramework(parseResult.rows, {
      title: title.trim(),
      frameworkType: frameworkType.trim() || undefined,
      adoptionStatus: adoptionStatus.trim() || undefined,
    })

    onUpload(framework)
    resetForm()
  }, [canUpload, parseResult, title, frameworkType, adoptionStatus, onUpload])

  const resetForm = useCallback(() => {
    setFile(null)
    setParseResult(null)
    setParsing(false)
    setTitle('')
    setFrameworkType('K-12')
    setAdoptionStatus('Draft')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleCancel = useCallback(() => {
    resetForm()
    onCancel()
  }, [resetForm, onCancel])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        void handleFileChange(droppedFile)
      }
    },
    [handleFileChange],
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleCancel()
      }}
    >
      <DialogContent className="p-5 sm:p-8 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">Create a framework from a spreadsheet</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed sm:text-base">
            Fill in your standards or competencies using our spreadsheet template, then upload
            the file here. We&rsquo;ll build the full framework for you automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:gap-5">
          {/* Step 1 — Template download (prominent) */}
          <div className="rounded-lg border border-[#662F90]/20 bg-[#662F90]/5 px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-sm font-semibold text-[#2E2F2F] sm:text-base">
              Step 1 &mdash; Download the template
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 sm:text-base">
              Start by downloading our template. It has the correct column headings and
              example rows so you can see exactly how to fill it in. <span className="font-semibold text-[#2E2F2F]">Your
              file must use this template format</span> for the upload to work.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:mt-3.5 sm:flex-row sm:items-center sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => downloadTemplate('csv')}
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Download CSV template
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => downloadTemplate('xlsx')}
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Download Excel template
              </Button>
            </div>
          </div>

          {/* Step 2 — File upload */}
          <div>
            <p className="mb-2 text-sm font-semibold text-[#2E2F2F] sm:mb-2.5 sm:text-base">
              Step 2 &mdash; Upload your completed spreadsheet
            </p>
            <button
              type="button"
              className={[
                'group relative w-full cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors sm:px-5 sm:py-7',
                file
                  ? 'border-[#662F90]/30 bg-[#662F90]/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50',
              ].join(' ')}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  void handleFileChange(f)
                }}
              />
              <ArrowUpTrayIcon className="mx-auto mb-2 h-7 w-7 text-gray-300 sm:h-8 sm:w-8" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-[#2E2F2F] sm:text-base">{file.name}</p>
                  <p className="mt-1 text-sm text-gray-500 sm:text-base">
                    {(file.size / 1024).toFixed(1)} KB &middot; Click or drop a different file to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 sm:text-base">
                    Drop your <span className="font-medium">.csv</span> or{' '}
                    <span className="font-medium">.xlsx</span> file here, or click to browse
                  </p>
                </div>
              )}
            </button>
          </div>

          {/* Parse preview */}
          {parseResult && !hasErrors && rowCount > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800 sm:px-5 sm:py-3.5 sm:text-base">
              Looking good! Found <span className="font-semibold">{rowCount}</span> item{rowCount !== 1 ? 's' : ''}
              {' '}across <span className="font-semibold">{maxLevel}</span> level{maxLevel !== 1 ? 's' : ''} of hierarchy.
              {parseResult.warnings.length > 0 && (
                <span className="ml-1 text-amber-700">
                  ({parseResult.warnings.length} warning{parseResult.warnings.length !== 1 ? 's' : ''} &mdash; see below)
                </span>
              )}
            </div>
          )}

          {/* Errors */}
          {hasErrors && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800 sm:px-5 sm:py-3.5 sm:text-base">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500 sm:h-6 sm:w-6" />
                <div>
                  <div className="font-semibold">We couldn&rsquo;t read this file</div>
                  <p className="mt-1">Please make sure you&rsquo;re using the template and that the required columns (Level and Full Statement) are filled in.</p>
                  {parseResult?.errors.map((err) => (
                    <div key={`${err.row ?? 'g'}-${err.message}`} className="mt-1.5 text-red-700">
                      {err.row ? `Row ${err.row}: ` : ''}
                      {err.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {(parseResult?.warnings.length ?? 0) > 0 && !hasErrors && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 sm:px-5 sm:py-3.5 sm:text-base">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 sm:h-6 sm:w-6" />
                <div>
                  <div className="font-semibold">A few things to note</div>
                  {parseResult?.warnings.map((w) => (
                    <div key={`${w.row ?? 'g'}-${w.message}`} className="mt-1.5">
                      {w.row ? `Row ${w.row}: ` : ''}
                      {w.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Framework details */}
          <div>
            <p className="mb-2 text-sm font-semibold text-[#2E2F2F] sm:mb-2.5 sm:text-base">
              Step 3 &mdash; Name your framework
            </p>
            <div className="grid gap-3 sm:gap-3.5">
              <div className="grid gap-2 sm:gap-2.5">
                <Label htmlFor="upload_title" className="text-sm sm:text-base">Framework title</Label>
                <Input
                  id="upload_title"
                  className="text-sm py-2 sm:text-base sm:py-2.5"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Grade 3–5 Mathematics"
                />
              </div>

              <div className="grid gap-2 sm:gap-2.5">
                <Label htmlFor="upload_type" className="text-sm sm:text-base">Framework type (optional)</Label>
                <Input
                  id="upload_type"
                  className="text-sm py-2 sm:text-base sm:py-2.5"
                  value={frameworkType}
                  onChange={(e) => setFrameworkType(e.target.value)}
                  placeholder="e.g. K-12"
                />
              </div>

              <div className="grid gap-2 sm:gap-2.5">
                <Label htmlFor="upload_status" className="text-sm sm:text-base">Adoption status (optional)</Label>
                <ComboboxInput
                  id="upload_status"
                  value={adoptionStatus}
                  onChange={setAdoptionStatus}
                  options={ADOPTION_STATUS_OPTIONS}
                  placeholder="Select or type a status"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button disabled={!canUpload} onClick={handleUpload}>
            {parsing ? 'Reading file...' : 'Create framework'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
