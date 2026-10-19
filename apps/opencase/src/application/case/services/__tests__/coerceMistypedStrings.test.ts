import { coerceMistypedStrings } from '../coerceMistypedStrings'
import { JsonSchemaValidator } from '../../../../infrastructure/validation/JsonSchemaValidator'

describe('coerceMistypedStrings', () => {
  let validator: JsonSchemaValidator

  beforeEach(() => {
    validator = new JsonSchemaValidator()
    validator.addSchema('test', {
      type: 'object',
      properties: {
        code: { type: 'string' },
        count: { type: 'integer' },
        flag: { type: 'string' },
        'a/b': { type: 'string' },
        types: {
          type: 'array',
          items: { type: 'object', properties: { hierarchyCode: { type: 'string' } } }
        }
      }
    })
  })

  it('turns numbers into strings where the schema expects a string, including in arrays', () => {
    const payload: any = { code: 7, types: [{ hierarchyCode: '1' }, { hierarchyCode: 2 }, { hierarchyCode: 3.5 }] }

    const coerced = coerceMistypedStrings(validator, 'test', payload)

    expect(payload).toEqual({ code: '7', types: [{ hierarchyCode: '1' }, { hierarchyCode: '2' }, { hierarchyCode: '3.5' }] })
    expect(coerced.sort()).toEqual(['/code', '/types/1/hierarchyCode', '/types/2/hierarchyCode'])
    expect(() => validator.validate('test', payload)).not.toThrow()
  })

  it('leaves fields the schema types as non-strings alone', () => {
    const payload: any = { count: 3 }
    expect(coerceMistypedStrings(validator, 'test', payload)).toEqual([])
    expect(payload).toEqual({ count: 3 })
  })

  it('only coerces numbers — other mistyped values are left for validation to report', () => {
    const payload: any = { code: true, flag: { nested: 1 }, types: [{ hierarchyCode: null }] }
    expect(coerceMistypedStrings(validator, 'test', payload)).toEqual([])
    expect(payload).toEqual({ code: true, flag: { nested: 1 }, types: [{ hierarchyCode: null }] })
  })

  it('resolves escaped JSON Pointer segments', () => {
    const payload: any = { 'a/b': 9 }
    coerceMistypedStrings(validator, 'test', payload)
    expect(payload).toEqual({ 'a/b': '9' })
  })

  it('is a no-op when there is no validator or the schema is not registered', () => {
    const payload: any = { code: 7 }
    expect(coerceMistypedStrings(undefined, 'test', payload)).toEqual([])
    expect(coerceMistypedStrings(validator, 'missing', payload)).toEqual([])
    expect(payload).toEqual({ code: 7 })
  })
})
