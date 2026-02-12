import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * A single row parsed from a spreadsheet.
 *
 * All fields except `level` and `fullStatement` are optional.
 * The parser normalises column headers (lowercase, trimmed) so users
 * don't have to match exact casing.
 */
export type SpreadsheetRow = {
  level: number
  fullStatement: string
  humanCodingScheme?: string
  itemType?: string
  abbreviatedStatement?: string
  educationLevel?: string[]
  subject?: string[]
  notes?: string
}

/** Errors surfaced to the user during parsing. */
export type ParseError = {
  row?: number // 1-based row (omitted for file-level errors)
  message: string
}

export type ParseResult = {
  rows: SpreadsheetRow[]
  errors: ParseError[]
  warnings: ParseError[]
}

// ── Header normalisation ────────────────────────────────────────────

/** Canonical column keys we recognise. */
const COLUMN_ALIASES: Record<string, string> = {
  level: 'level',
  depth: 'level',
  indent: 'level',

  'full statement': 'fullStatement',
  fullstatement: 'fullStatement',
  statement: 'fullStatement',
  description: 'fullStatement',

  'human coding scheme': 'humanCodingScheme',
  humancodingscheme: 'humanCodingScheme',
  code: 'humanCodingScheme',
  'coding scheme': 'humanCodingScheme',

  'item type': 'itemType',
  itemtype: 'itemType',
  type: 'itemType',

  'abbreviated statement': 'abbreviatedStatement',
  abbreviatedstatement: 'abbreviatedStatement',
  abbreviation: 'abbreviatedStatement',
  'short statement': 'abbreviatedStatement',

  'education level': 'educationLevel',
  educationlevel: 'educationLevel',
  'grade level': 'educationLevel',
  grade: 'educationLevel',

  subject: 'subject',
  subjects: 'subject',

  notes: 'notes',
  note: 'notes',
  comments: 'notes',
}

function normaliseHeader(raw: string): string | null {
  const key = raw.trim().toLowerCase().replaceAll(/[_-]+/g, ' ')
  return COLUMN_ALIASES[key] ?? null
}

// ── Semicolon-separated list helper ─────────────────────────────────

function splitList(value: string | undefined): string[] | undefined {
  if (!value) return undefined
  const parts = value
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : undefined
}

// ── Raw record → SpreadsheetRow ─────────────────────────────────────

function mapRecord(
  record: Record<string, string>,
  headerMap: Record<string, string>,
  rowIndex: number, // 1-based
  errors: ParseError[],
): SpreadsheetRow | null {
  const get = (canonical: string): string | undefined => {
    for (const [raw, mapped] of Object.entries(headerMap)) {
      if (mapped === canonical) {
        const val = record[raw]?.trim()
        return val || undefined
      }
    }
    return undefined
  }

  // Required: level
  const levelStr = get('level')
  if (!levelStr) {
    errors.push({ row: rowIndex, message: 'Missing "Level" value.' })
    return null
  }
  const level = Number(levelStr)
  if (!Number.isInteger(level) || level < 1) {
    errors.push({ row: rowIndex, message: `Invalid level "${levelStr}" — must be a positive integer.` })
    return null
  }

  // Required: fullStatement
  const fullStatement = get('fullStatement')
  if (!fullStatement) {
    errors.push({ row: rowIndex, message: 'Missing "Full Statement" value.' })
    return null
  }

  return {
    level,
    fullStatement,
    humanCodingScheme: get('humanCodingScheme'),
    itemType: get('itemType'),
    abbreviatedStatement: get('abbreviatedStatement'),
    educationLevel: splitList(get('educationLevel')),
    subject: splitList(get('subject')),
    notes: get('notes'),
  }
}

// ── Structural validation ───────────────────────────────────────────

function validateStructure(rows: SpreadsheetRow[], warnings: ParseError[]) {
  if (rows.length === 0) return

  // First row must be level 1
  if (rows[0].level !== 1) {
    warnings.push({ row: 1, message: 'First item should be level 1 (top-level). Treating as level 1.' })
    rows[0] = { ...rows[0], level: 1 }
  }

  // Check for level gaps (e.g. jumping from 1 to 3)
  let maxSeen = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.level > maxSeen + 1) {
      warnings.push({
        row: i + 1,
        message: `Level jumps from ${maxSeen} to ${row.level}. Clamping to ${maxSeen + 1}.`,
      })
      rows[i] = { ...rows[i], level: maxSeen + 1 }
    }
    if (rows[i].level > maxSeen) maxSeen = rows[i].level
  }
}

// ── Shared header map builder ───────────────────────────────────────

type HeaderMapResult = {
  headerMap: Record<string, string>
  hasLevel: boolean
  hasStatement: boolean
}

function buildHeaderMap(headers: string[]): HeaderMapResult {
  const headerMap: Record<string, string> = {}
  let hasLevel = false
  let hasStatement = false

  for (const h of headers) {
    if (h.trimStart().startsWith('#')) continue
    const canonical = normaliseHeader(h)
    if (canonical) {
      headerMap[h] = canonical
      if (canonical === 'level') hasLevel = true
      if (canonical === 'fullStatement') hasStatement = true
    }
  }
  return { headerMap, hasLevel, hasStatement }
}

function checkRequiredHeaders(hm: HeaderMapResult, errors: ParseError[]): boolean {
  if (!hm.hasLevel) errors.push({ message: 'Spreadsheet is missing a "Level" column.' })
  if (!hm.hasStatement) errors.push({ message: 'Spreadsheet is missing a "Full Statement" column.' })
  return hm.hasLevel && hm.hasStatement
}

/** Map an array of raw records to SpreadsheetRows using the given header map. */
function mapRecords(
  records: Record<string, string>[],
  headerMap: Record<string, string>,
  errors: ParseError[],
): SpreadsheetRow[] {
  const rows: SpreadsheetRow[] = []
  const levelKey = Object.keys(headerMap).find((k) => headerMap[k] === 'level')

  for (let i = 0; i < records.length; i++) {
    // Skip comment rows (level value starts with #)
    if (levelKey && records[i][levelKey]?.trimStart().startsWith('#')) continue
    const mapped = mapRecord(records[i], headerMap, i + 1, errors)
    if (mapped) rows.push(mapped)
  }
  return rows
}

// ── CSV parsing ─────────────────────────────────────────────────────

function parseCsvText(text: string): ParseResult {
  const errors: ParseError[] = []
  const warnings: ParseError[] = []

  // Strip comment rows (lines starting with #)
  const cleaned = text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n')

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })

  for (const e of result.errors) {
    errors.push({ row: e.row != null ? e.row + 1 : undefined, message: e.message })
  }

  const hm = buildHeaderMap(result.meta.fields ?? [])
  if (!checkRequiredHeaders(hm, errors)) return { rows: [], errors, warnings }

  const rows = mapRecords(result.data, hm.headerMap, errors)
  validateStructure(rows, warnings)
  return { rows, errors, warnings }
}

// ── XLSX parsing ────────────────────────────────────────────────────

function readWorkbook(buffer: ArrayBuffer): XLSX.WorkBook | string {
  try {
    return XLSX.read(buffer, { type: 'array' })
  } catch {
    return 'Unable to read the Excel file. Is it a valid .xlsx or .xls file?'
  }
}

function parseXlsxBuffer(buffer: ArrayBuffer): ParseResult {
  const errors: ParseError[] = []
  const warnings: ParseError[] = []

  const workbook = readWorkbook(buffer)
  if (typeof workbook === 'string') {
    return { rows: [], errors: [{ message: workbook }], warnings }
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { rows: [], errors: [{ message: 'The Excel file contains no sheets.' }], warnings }
  }

  const sheet = workbook.Sheets[sheetName]
  const records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',
    raw: false,
  })

  if (records.length === 0) {
    return { rows: [], errors: [{ message: 'The spreadsheet appears to be empty.' }], warnings }
  }

  const hm = buildHeaderMap(Object.keys(records[0]))
  if (!checkRequiredHeaders(hm, errors)) return { rows: [], errors, warnings }

  const rows = mapRecords(records, hm.headerMap, errors)
  validateStructure(rows, warnings)
  return { rows, errors, warnings }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Parse a spreadsheet file (CSV or XLSX) into structured rows.
 *
 * This is a pure function with no side effects — safe to call from
 * any layer. File reading uses the browser File API.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
    const text = await file.text()
    return parseCsvText(text)
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    return parseXlsxBuffer(buffer)
  }

  return {
    rows: [],
    errors: [{ message: `Unsupported file type. Please upload a .csv or .xlsx file.` }],
    warnings: [],
  }
}

/**
 * Parse CSV text directly (useful for testing without File objects).
 */
export function parseCsvString(text: string): ParseResult {
  return parseCsvText(text)
}
