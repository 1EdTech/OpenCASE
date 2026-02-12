import type { Framework, FrameworkMetadata, ItemType } from '@/domain/framework/model/types'
import type { FrameworkId, ItemId, AssociationId } from '@/domain/shared/types'
import type { SpreadsheetRow } from './SpreadsheetParser'

// ── ID generation ───────────────────────────────────────────────────

function generateId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// ── Item type normalisation ─────────────────────────────────────────

const VALID_ITEM_TYPES: Record<string, ItemType> = {
  standard: 'Standard',
  learningoutcome: 'LearningOutcome',
  'learning outcome': 'LearningOutcome',
  competency: 'Competency',
  skill: 'Skill',
}

function normaliseItemType(raw: string | undefined): ItemType {
  if (!raw) return 'Standard'
  return VALID_ITEM_TYPES[raw.trim().toLowerCase()] ?? 'Standard'
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Convert parsed spreadsheet rows into a domain Framework.
 *
 * This is a pure function — no side effects, no React dependency.
 * Items and associations (isChildOf) are constructed based on the
 * `level` field in each row.
 *
 * @param rows - Parsed and validated SpreadsheetRow array
 * @param metadata - Framework-level metadata (title, type, etc.)
 * @returns A complete domain Framework ready for the editor
 */
export function spreadsheetToFramework(
  rows: SpreadsheetRow[],
  metadata: FrameworkMetadata,
): Framework {
  const frameworkId = generateId() as unknown as FrameworkId
  const items = new Map<ItemId, Framework['items'] extends Map<ItemId, infer V> ? V : never>()
  const associations = new Map<AssociationId, Framework['associations'] extends Map<AssociationId, infer V> ? V : never>()

  // Parent stack: parentStack[level] = ItemId of the most recent item at that level.
  // Level 0 represents the framework root itself.
  const parentStack: (string | null)[] = [frameworkId as unknown as string]

  for (const row of rows) {
    const itemId = generateId() as unknown as ItemId

    // Create the domain Item
    items.set(itemId, {
      id: itemId,
      statement: row.fullStatement,
      type: normaliseItemType(row.itemType),
      metadata: {
        ...(row.humanCodingScheme && { humanCodingScheme: row.humanCodingScheme }),
        ...(row.abbreviatedStatement && { abbreviatedStatement: row.abbreviatedStatement }),
        ...(row.educationLevel && { educationLevel: row.educationLevel }),
        ...(row.subject && { subject: row.subject }),
        ...(row.notes && { notes: row.notes }),
      },
    })

    // Determine parent: the nearest item at level - 1
    const parentId = parentStack[row.level - 1] ?? parentStack[0]

    // Create isChildOf association: this item → parent
    if (parentId) {
      const assocId = generateId() as unknown as AssociationId
      associations.set(assocId, {
        id: assocId,
        fromItemId: itemId,
        toItemId: parentId as unknown as ItemId,
        associationType: 'isChildOf',
      })
    }

    // Update the stack: this item is the new potential parent at its level
    parentStack[row.level] = itemId as unknown as string

    // Clear deeper levels (a new item at level 2 invalidates any previous level-3+ parents)
    parentStack.length = row.level + 1
  }

  return {
    id: frameworkId,
    metadata: {
      ...metadata,
      lastChangeDateTime: new Date().toISOString(),
      caseVersion: metadata.caseVersion ?? '1.1',
    },
    items,
    associations,
    status: 'Draft',
  }
}
