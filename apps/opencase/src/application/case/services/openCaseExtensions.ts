/** The extension key under which OpenCASE stores its own editor/app state. */
export const OPENCASE_EXT_KEY = 'ext:opencase'

/**
 * Remove the OpenCASE-proprietary `ext:opencase` key from every `extensions`
 * object anywhere in a CASE payload (CFPackage, CFDocument list, single entity…).
 * All other extensions are framework data and are left as-is; an `extensions`
 * object left empty is removed entirely. Extension values are opaque
 * third-party data and are never walked into. Returns a new value; the input
 * is not mutated.
 */
export function stripOpenCaseExtensions<T> (payload: T): T {
  if (!payload || typeof payload !== 'object') return payload

  const walk = (value: any): any => {
    if (!value || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(walk)

    const out: any = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === 'extensions' && v && typeof v === 'object' && !Array.isArray(v)) {
        const { [OPENCASE_EXT_KEY]: _opencase, ...rest } = v as Record<string, unknown>
        if (Object.keys(rest).length > 0) out[k] = rest
        continue
      }
      out[k] = walk(v)
    }
    return out
  }

  return walk(payload)
}
