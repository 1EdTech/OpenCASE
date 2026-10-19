import type { JsonSchemaValidator } from '../../../infrastructure/validation/JsonSchemaValidator'

/** Resolve the parent container and key a JSON Pointer (AJV `instancePath`) refers to. */
function resolvePointer (root: any, pointer: string): { parent: any, key: string } | null {
  const segments = pointer.split('/').slice(1).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))
  if (segments.length === 0) return null
  let parent = root
  for (const segment of segments.slice(0, -1)) {
    if (parent === null || typeof parent !== 'object') return null
    parent = parent[segment]
  }
  if (parent === null || typeof parent !== 'object') return null
  return { parent, key: segments[segments.length - 1] }
}

/**
 * Gently fix publisher data where the schema expects a string but the source
 * sent a number (e.g. `"hierarchyCode": 1` instead of `"1"`). Import validation
 * is lenient, but every later save is strictly validated against the same
 * schema, so a mistyped value saved as-is would leave the framework unsaveable.
 *
 * Driven by the schema's own `type` errors, so only fields the schema declares
 * as strings are touched; nothing else about the payload is changed. Mutates
 * `payload` in place and returns the instance paths that were coerced. A
 * missing validator or unregistered schema is a no-op.
 */
export function coerceMistypedStrings (
  validator: JsonSchemaValidator | undefined,
  schemaName: string,
  payload: unknown
): string[] {
  if (!validator?.hasSchema(schemaName)) return []

  let errors: any[]
  try {
    validator.validate(schemaName, payload)
    return []
  } catch (error: any) {
    errors = Array.isArray(error?.details) ? error.details : []
  }

  const coerced = new Set<string>()
  for (const err of errors) {
    if (err?.keyword !== 'type' || typeof err.instancePath !== 'string') continue
    const expected = err.params?.type
    const expectsString = Array.isArray(expected) ? expected.includes('string') : expected === 'string'
    if (!expectsString || coerced.has(err.instancePath)) continue

    const target = resolvePointer(payload, err.instancePath)
    if (!target) continue
    const value = target.parent[target.key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue

    target.parent[target.key] = String(value)
    coerced.add(err.instancePath)
  }

  return [...coerced]
}
