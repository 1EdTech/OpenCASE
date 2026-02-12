import { describe, it, expect } from 'vitest'
import { parseCsvString } from './SpreadsheetParser'

describe('SpreadsheetParser', () => {
  describe('parseCsvString', () => {
    it('parses a valid CSV with all columns', () => {
      const csv = [
        'Level,Human Coding Scheme,Full Statement,Item Type,Abbreviated Statement,Education Level,Subject,Notes',
        '1,3.NBT,Number and Operations in Base Ten,Standard,Base Ten Ops,Grade 3,Mathematics,Some note',
        '2,3.NBT.A,Use place value understanding,Competency,,Grade 3;Grade 4,Mathematics;Science,',
      ].join('\n')

      const result = parseCsvString(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(2)

      expect(result.rows[0]).toEqual({
        level: 1,
        fullStatement: 'Number and Operations in Base Ten',
        humanCodingScheme: '3.NBT',
        itemType: 'Standard',
        abbreviatedStatement: 'Base Ten Ops',
        educationLevel: ['Grade 3'],
        subject: ['Mathematics'],
        notes: 'Some note',
      })

      // Semicolon-separated lists
      expect(result.rows[1].educationLevel).toEqual(['Grade 3', 'Grade 4'])
      expect(result.rows[1].subject).toEqual(['Mathematics', 'Science'])
    })

    it('requires Level and Full Statement columns', () => {
      const csv = 'Code,Notes\n3.NBT,some note'
      const result = parseCsvString(csv)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some((e) => e.message.includes('Level'))).toBe(true)
      expect(result.errors.some((e) => e.message.includes('Full Statement'))).toBe(true)
      expect(result.rows).toHaveLength(0)
    })

    it('requires level value on each row', () => {
      const csv = 'Level,Full Statement\n,Missing level here'
      const result = parseCsvString(csv)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Level')
      expect(result.rows).toHaveLength(0)
    })

    it('requires fullStatement value on each row', () => {
      const csv = 'Level,Full Statement\n1,'
      const result = parseCsvString(csv)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Full Statement')
      expect(result.rows).toHaveLength(0)
    })

    it('rejects non-integer levels', () => {
      const csv = 'Level,Full Statement\n1.5,Bad level'
      const result = parseCsvString(csv)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('positive integer')
    })

    it('rejects negative levels', () => {
      const csv = 'Level,Full Statement\n-1,Bad level'
      const result = parseCsvString(csv)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('positive integer')
    })

    it('strips comment rows (lines starting with #)', () => {
      const csv = [
        '# This is a comment',
        'Level,Full Statement',
        '# Another comment',
        '1,First item',
        '2,Second item',
      ].join('\n')

      const result = parseCsvString(csv)
      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].fullStatement).toBe('First item')
    })

    it('warns and clamps when first row is not level 1', () => {
      const csv = 'Level,Full Statement\n3,Deep item'
      const result = parseCsvString(csv)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.rows[0].level).toBe(1) // clamped
    })

    it('warns and clamps level gaps', () => {
      const csv = 'Level,Full Statement\n1,Top\n3,Jump to 3'
      const result = parseCsvString(csv)

      expect(result.warnings.some((w) => w.message.includes('jumps'))).toBe(true)
      expect(result.rows[1].level).toBe(2) // clamped from 3 to 2
    })

    it('handles alternative column names (case-insensitive)', () => {
      const csv = 'depth,statement,code,type\n1,A competency,C1,Competency'
      const result = parseCsvString(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].level).toBe(1)
      expect(result.rows[0].fullStatement).toBe('A competency')
      expect(result.rows[0].humanCodingScheme).toBe('C1')
      expect(result.rows[0].itemType).toBe('Competency')
    })

    it('handles empty input', () => {
      const result = parseCsvString('')
      // Should have errors about missing columns since there are no headers
      expect(result.rows).toHaveLength(0)
    })

    it('skips empty lines', () => {
      const csv = 'Level,Full Statement\n1,First item\n\n2,Second item\n\n'
      const result = parseCsvString(csv)

      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(2)
    })

    it('handles comma-separated list values', () => {
      const csv = 'Level,Full Statement,Education Level,Subject\n1,Item,"Grade 3, Grade 4","Math, Science"'
      const result = parseCsvString(csv)

      expect(result.rows[0].educationLevel).toEqual(['Grade 3', 'Grade 4'])
      expect(result.rows[0].subject).toEqual(['Math', 'Science'])
    })
  })
})
