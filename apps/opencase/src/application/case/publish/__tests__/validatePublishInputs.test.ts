import { validatePublishInputs } from '../validatePublishInputs'

describe('validatePublishInputs', () => {
  it('passes a framework with a description and statements on every item', () => {
    const issues = validatePublishInputs({
      CFDocument: { description: 'A real description' },
      CFItems: [{ identifier: 'a', fullStatement: 'Do X' }, { identifier: 'b', fullStatement: 'Do Y' }],
    })
    expect(issues).toEqual([])
  })

  it('flags a missing framework description', () => {
    const issues = validatePublishInputs({ CFDocument: {}, CFItems: [{ fullStatement: 'x' }] })
    expect(issues.map((i) => i.code)).toEqual(['framework_description_missing'])
  })

  it('treats a blank/whitespace description as missing', () => {
    const issues = validatePublishInputs({ CFDocument: { description: '   ' }, CFItems: [] })
    expect(issues.map((i) => i.code)).toContain('framework_description_missing')
  })

  it('flags competencies with no statement text and samples their coding scheme', () => {
    const issues = validatePublishInputs({
      CFDocument: { description: 'ok' },
      CFItems: [
        { identifier: 'a', humanCodingScheme: 'SCI.1', fullStatement: 'has text' },
        { identifier: 'b', humanCodingScheme: 'SCI.2', fullStatement: '' },
        { identifier: 'c', humanCodingScheme: 'SCI.3' },
      ],
    })
    const issue = issues.find((i) => i.code === 'competency_text_missing')
    expect(issue?.count).toBe(2)
    expect(issue?.samples).toEqual(['SCI.2', 'SCI.3'])
  })

  it('caps the number of samples', () => {
    const CFItems = Array.from({ length: 10 }, (_, i) => ({ identifier: `x${i}`, fullStatement: '' }))
    const issues = validatePublishInputs({ CFDocument: { description: 'ok' }, CFItems })
    const issue = issues.find((i) => i.code === 'competency_text_missing')
    expect(issue?.count).toBe(10)
    expect(issue?.samples).toHaveLength(5)
  })
})
