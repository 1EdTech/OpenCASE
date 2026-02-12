import * as XLSX from 'xlsx'

/**
 * Template column definitions for the framework spreadsheet.
 */
const TEMPLATE_HEADERS = [
  'Level',
  'Human Coding Scheme',
  'Full Statement',
  'Item Type',
  'Abbreviated Statement',
  'Education Level',
  'Subject',
  'Notes',
]

/**
 * Example rows demonstrating the expected format.
 */
const EXAMPLE_ROWS: string[][] = [
  ['1', '3.NBT', 'Number and Operations in Base Ten', 'Standard', 'Base Ten Operations', 'Grade 3', 'Mathematics', ''],
  ['2', '3.NBT.A', 'Use place value understanding and properties of operations to perform multi-digit arithmetic', 'Standard', 'Place value arithmetic', 'Grade 3', 'Mathematics', ''],
  ['3', '3.NBT.A.1', 'Use place value understanding to round whole numbers to the nearest 10 or 100', 'Standard', 'Rounding', 'Grade 3', 'Mathematics', 'Foundational skill for estimation'],
  ['3', '3.NBT.A.2', 'Fluently add and subtract within 1000 using strategies based on place value', 'Standard', 'Add/subtract within 1000', 'Grade 3', 'Mathematics', ''],
  ['2', '3.NBT.B', 'Multiply one-digit whole numbers by multiples of 10', 'Standard', 'Multiply by 10s', 'Grade 3', 'Mathematics', ''],
]

/**
 * Instructions included as a comment row in the CSV template.
 */
const CSV_INSTRUCTIONS = [
  '# INSTRUCTIONS (delete this row before uploading):',
  '# - Level: 1 = top-level item; 2 = child of nearest level-1 above; 3 = child of nearest level-2; etc.',
  '# - Full Statement: required — the competency or standard text',
  '# - Item Type: Standard | Competency | LearningOutcome | Skill (defaults to Standard)',
  '# - Education Level / Subject: use semicolons for multiple values (e.g. "Grade 3; Grade 4")',
  '# - Delete the example rows below and replace with your own data.',
]

// ── CSV generation ──────────────────────────────────────────────────

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function generateCsv(): string {
  const lines: string[] = []

  // Instructions (comment rows)
  for (const instruction of CSV_INSTRUCTIONS) {
    lines.push(instruction)
  }

  // Header row
  lines.push(TEMPLATE_HEADERS.map(escapeCsvField).join(','))

  // Example data rows
  for (const row of EXAMPLE_ROWS) {
    lines.push(row.map(escapeCsvField).join(','))
  }

  return lines.join('\n')
}

// ── XLSX generation ─────────────────────────────────────────────────

function generateXlsx(): ArrayBuffer {
  const wb = XLSX.utils.book_new()

  // Build data: headers + example rows
  const data = [TEMPLATE_HEADERS, ...EXAMPLE_ROWS]
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Set reasonable column widths
  ws['!cols'] = [
    { wch: 6 },  // Level
    { wch: 22 }, // Human Coding Scheme
    { wch: 80 }, // Full Statement
    { wch: 18 }, // Item Type
    { wch: 30 }, // Abbreviated Statement
    { wch: 20 }, // Education Level
    { wch: 18 }, // Subject
    { wch: 30 }, // Notes
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Framework Template')

  // Write to buffer
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return buffer as ArrayBuffer
}

// ── Download helpers ────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Download a framework template file in the specified format.
 */
export function downloadTemplate(format: 'csv' | 'xlsx') {
  if (format === 'csv') {
    const csv = generateCsv()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    triggerDownload(blob, 'framework-template.csv')
  } else {
    const buffer = generateXlsx()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    triggerDownload(blob, 'framework-template.xlsx')
  }
}
