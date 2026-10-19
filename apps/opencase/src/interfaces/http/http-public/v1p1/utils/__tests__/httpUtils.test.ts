import { stripExtensions, stripOpenCaseExtensions } from '../httpUtils'

describe('stripOpenCaseExtensions', () => {
  it('removes only ext:opencase and keeps other extensions on every entity in a package', () => {
    const pkg = {
      CFDocument: {
        identifier: 'doc-1',
        extensions: { 'ext:opencase': { layout: {} }, sourceSystem: 'smartschool' }
      },
      CFItems: [
        { identifier: 'item-1', extensions: { 'ext:opencase': { colorBand: 'red' }, smartschoolId: 'ss-1' } },
        { identifier: 'item-2', extensions: { smartschoolId: 'ss-2' } }
      ],
      CFAssociations: [
        { identifier: 'assoc-1', extensions: { 'ext:opencase': { originHandle: 'top' }, minimumGoal: 'MG-7' } }
      ]
    }

    expect(stripOpenCaseExtensions(pkg)).toEqual({
      CFDocument: { identifier: 'doc-1', extensions: { sourceSystem: 'smartschool' } },
      CFItems: [
        { identifier: 'item-1', extensions: { smartschoolId: 'ss-1' } },
        { identifier: 'item-2', extensions: { smartschoolId: 'ss-2' } }
      ],
      CFAssociations: [
        { identifier: 'assoc-1', extensions: { minimumGoal: 'MG-7' } }
      ]
    })
  })

  it('drops the extensions property when only ext:opencase was present', () => {
    const result = stripOpenCaseExtensions({ identifier: 'item-1', extensions: { 'ext:opencase': { colorBand: 'red' } } })
    expect(result).toEqual({ identifier: 'item-1' })
  })

  it('does not walk into extension values', () => {
    const nested = { extensions: { 'ext:opencase': 'third-party data that happens to reuse the key' } }
    const result = stripOpenCaseExtensions({ extensions: { vendor: nested } })
    expect(result).toEqual({ extensions: { vendor: nested } })
  })

  it('does not mutate the input', () => {
    const input = { extensions: { 'ext:opencase': { a: 1 }, custom: 2 } }
    stripOpenCaseExtensions(input)
    expect(input).toEqual({ extensions: { 'ext:opencase': { a: 1 }, custom: 2 } })
  })

  it('returns primitives and null unchanged', () => {
    expect(stripOpenCaseExtensions(null)).toBeNull()
    expect(stripOpenCaseExtensions('x')).toBe('x')
  })
})

describe('stripExtensions', () => {
  it('removes every extensions property (CASE v1.0 has no extensions field)', () => {
    const pkg = {
      CFDocument: { identifier: 'doc-1', extensions: { sourceSystem: 'smartschool' } },
      CFItems: [{ identifier: 'item-1', extensions: { 'ext:opencase': {}, smartschoolId: 'ss-1' } }]
    }
    expect(stripExtensions(pkg)).toEqual({
      CFDocument: { identifier: 'doc-1' },
      CFItems: [{ identifier: 'item-1' }]
    })
  })
})
