import { describe, it, expect } from 'vitest'
import { spreadsheetToFramework } from './SpreadsheetToFramework'
import type { SpreadsheetRow } from './SpreadsheetParser'

function makeRow(overrides: Partial<SpreadsheetRow> & { level: number; fullStatement: string }): SpreadsheetRow {
  return {
    level: overrides.level,
    fullStatement: overrides.fullStatement,
    humanCodingScheme: overrides.humanCodingScheme,
    itemType: overrides.itemType,
    abbreviatedStatement: overrides.abbreviatedStatement,
    educationLevel: overrides.educationLevel,
    subject: overrides.subject,
    notes: overrides.notes,
  }
}

describe('SpreadsheetToFramework', () => {
  it('creates a framework with correct metadata', () => {
    const rows: SpreadsheetRow[] = [makeRow({ level: 1, fullStatement: 'Top item' })]
    const fw = spreadsheetToFramework(rows, { title: 'Test Framework', frameworkType: 'K-12' })

    expect(fw.metadata.title).toBe('Test Framework')
    expect(fw.metadata.frameworkType).toBe('K-12')
    expect(fw.metadata.caseVersion).toBe('1.1')
    expect(fw.status).toBe('Draft')
  })

  it('creates one item per row', () => {
    const rows: SpreadsheetRow[] = [
      makeRow({ level: 1, fullStatement: 'Item A' }),
      makeRow({ level: 1, fullStatement: 'Item B' }),
      makeRow({ level: 1, fullStatement: 'Item C' }),
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })

    expect(fw.items.size).toBe(3)
  })

  it('creates isChildOf associations based on level', () => {
    const rows: SpreadsheetRow[] = [
      makeRow({ level: 1, fullStatement: 'Parent' }),
      makeRow({ level: 2, fullStatement: 'Child' }),
      makeRow({ level: 3, fullStatement: 'Grandchild' }),
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })

    expect(fw.associations.size).toBe(3) // All 3 items have a parent (including level 1 → framework root)
    const assocArray = [...fw.associations.values()]
    for (const assoc of assocArray) {
      expect(assoc.associationType).toBe('isChildOf')
    }
  })

  it('level 1 items are children of the framework root', () => {
    const rows: SpreadsheetRow[] = [makeRow({ level: 1, fullStatement: 'Top item' })]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })

    const assoc = [...fw.associations.values()][0]
    // The toItemId should be the framework ID (parent)
    expect(String(assoc.toItemId)).toBe(String(fw.id))
  })

  it('level 2 items are children of the nearest preceding level 1', () => {
    const rows: SpreadsheetRow[] = [
      makeRow({ level: 1, fullStatement: 'Parent A' }),
      makeRow({ level: 2, fullStatement: 'Child of A' }),
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })

    const items = [...fw.items.values()]
    const parentItem = items.find((i) => i.statement === 'Parent A')!
    const childItem = items.find((i) => i.statement === 'Child of A')!

    const childAssoc = [...fw.associations.values()].find(
      (a) => String(a.fromItemId) === String(childItem.id),
    )!
    expect(String(childAssoc.toItemId)).toBe(String(parentItem.id))
  })

  it('handles sibling items at the same level', () => {
    const rows: SpreadsheetRow[] = [
      makeRow({ level: 1, fullStatement: 'Parent' }),
      makeRow({ level: 2, fullStatement: 'Sibling A' }),
      makeRow({ level: 2, fullStatement: 'Sibling B' }),
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })

    const items = [...fw.items.values()]
    const parent = items.find((i) => i.statement === 'Parent')!
    const siblingA = items.find((i) => i.statement === 'Sibling A')!
    const siblingB = items.find((i) => i.statement === 'Sibling B')!

    // Both siblings should be children of the same parent
    const assocA = [...fw.associations.values()].find((a) => String(a.fromItemId) === String(siblingA.id))!
    const assocB = [...fw.associations.values()].find((a) => String(a.fromItemId) === String(siblingB.id))!
    expect(String(assocA.toItemId)).toBe(String(parent.id))
    expect(String(assocB.toItemId)).toBe(String(parent.id))
  })

  it('re-parents correctly when level decreases', () => {
    // 1: A
    //   2: B (child of A)
    //     3: C (child of B)
    //   2: D (child of A, NOT child of B)
    const rows: SpreadsheetRow[] = [
      makeRow({ level: 1, fullStatement: 'A' }),
      makeRow({ level: 2, fullStatement: 'B' }),
      makeRow({ level: 3, fullStatement: 'C' }),
      makeRow({ level: 2, fullStatement: 'D' }),
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })

    const items = [...fw.items.values()]
    const itemA = items.find((i) => i.statement === 'A')!
    const itemB = items.find((i) => i.statement === 'B')!
    const itemC = items.find((i) => i.statement === 'C')!
    const itemD = items.find((i) => i.statement === 'D')!

    const assocC = [...fw.associations.values()].find((a) => String(a.fromItemId) === String(itemC.id))!
    const assocD = [...fw.associations.values()].find((a) => String(a.fromItemId) === String(itemD.id))!

    expect(String(assocC.toItemId)).toBe(String(itemB.id)) // C is child of B
    expect(String(assocD.toItemId)).toBe(String(itemA.id)) // D is child of A (not B)
  })

  it('preserves item metadata from spreadsheet rows', () => {
    const rows: SpreadsheetRow[] = [
      makeRow({
        level: 1,
        fullStatement: 'A standard',
        humanCodingScheme: '3.NBT.A.1',
        itemType: 'Standard',
        abbreviatedStatement: 'Short',
        educationLevel: ['Grade 3', 'Grade 4'],
        subject: ['Mathematics'],
        notes: 'A note',
      }),
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })
    const item = [...fw.items.values()][0]

    expect(item.statement).toBe('A standard')
    expect(item.type).toBe('Standard')
    expect(item.metadata).toEqual({
      humanCodingScheme: '3.NBT.A.1',
      abbreviatedStatement: 'Short',
      educationLevel: ['Grade 3', 'Grade 4'],
      subject: ['Mathematics'],
      notes: 'A note',
    })
  })

  it('normalises item type (case-insensitive)', () => {
    const rows: SpreadsheetRow[] = [
      makeRow({ level: 1, fullStatement: 'A', itemType: 'competency' }),
      makeRow({ level: 1, fullStatement: 'B', itemType: 'LEARNING OUTCOME' }),
      makeRow({ level: 1, fullStatement: 'C', itemType: 'skill' }),
      makeRow({ level: 1, fullStatement: 'D' }), // defaults to Standard
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })
    const items = [...fw.items.values()]

    expect(items[0].type).toBe('Competency')
    expect(items[1].type).toBe('LearningOutcome')
    expect(items[2].type).toBe('Skill')
    expect(items[3].type).toBe('Standard')
  })

  it('handles a single item (flat framework)', () => {
    const rows: SpreadsheetRow[] = [makeRow({ level: 1, fullStatement: 'Only item' })]
    const fw = spreadsheetToFramework(rows, { title: 'Single' })

    expect(fw.items.size).toBe(1)
    expect(fw.associations.size).toBe(1) // isChildOf framework root
  })

  it('handles all level-1 items (flat list)', () => {
    const rows: SpreadsheetRow[] = [
      makeRow({ level: 1, fullStatement: 'A' }),
      makeRow({ level: 1, fullStatement: 'B' }),
      makeRow({ level: 1, fullStatement: 'C' }),
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Flat' })

    expect(fw.items.size).toBe(3)
    expect(fw.associations.size).toBe(3) // All children of framework root

    const fwId = String(fw.id)
    for (const assoc of fw.associations.values()) {
      expect(String(assoc.toItemId)).toBe(fwId)
    }
  })

  it('generates unique IDs for all items and associations', () => {
    const rows: SpreadsheetRow[] = [
      makeRow({ level: 1, fullStatement: 'A' }),
      makeRow({ level: 2, fullStatement: 'B' }),
      makeRow({ level: 2, fullStatement: 'C' }),
    ]
    const fw = spreadsheetToFramework(rows, { title: 'Test' })

    const itemIds = [...fw.items.keys()].map(String)
    const assocIds = [...fw.associations.keys()].map(String)
    const allIds = [String(fw.id), ...itemIds, ...assocIds]

    // All IDs should be unique
    expect(new Set(allIds).size).toBe(allIds.length)
  })
})
