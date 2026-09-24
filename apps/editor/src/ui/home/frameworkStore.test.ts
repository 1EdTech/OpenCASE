import { describe, it, expect } from 'vitest'
import { createNewFrameworkDraft } from './frameworkStore'

describe('createNewFrameworkDraft', () => {
  it('leaves frameworkType undefined when not provided', () => {
    const fw = createNewFrameworkDraft({ title: 'My framework' })
    const frameworkNode = fw.graph?.nodes.find((n) => n.type === 'caseFrameworkNode') as
      | { data: { cfDocument: { frameworkType?: string } } }
      | undefined

    expect(fw.framework.metadata?.frameworkType).toBeUndefined()
    expect(fw.cfDocument.frameworkType).toBeUndefined()
    expect(frameworkNode?.data.cfDocument.frameworkType).toBeUndefined()
  })

  it('preserves an explicit frameworkType when provided', () => {
    const fw = createNewFrameworkDraft({ title: 'My framework', frameworkType: 'Higher Ed' })
    const frameworkNode = fw.graph?.nodes.find((n) => n.type === 'caseFrameworkNode') as
      | { data: { cfDocument: { frameworkType?: string } } }
      | undefined

    expect(fw.framework.metadata?.frameworkType).toBe('Higher Ed')
    expect(fw.cfDocument.frameworkType).toBe('Higher Ed')
    expect(frameworkNode?.data.cfDocument.frameworkType).toBe('Higher Ed')
  })
})
