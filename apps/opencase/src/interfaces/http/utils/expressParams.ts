import type { Request } from 'express'

/**
 * Express v5 typings allow path params to be `string | string[]`.
 * In practice for our routes we expect a single string value.
 */
export function getParam (req: Request, name: string): string | undefined {
  const v = (req.params as any)?.[name] as string | string[] | undefined
  return Array.isArray(v) ? v[0] : v
}

