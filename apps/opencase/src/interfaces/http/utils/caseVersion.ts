import type { Request } from 'express'

export type CaseVersion = '1.0' | '1.1'

export function getCaseVersion (
  req: Request,
  opts?: { default?: CaseVersion }
): CaseVersion | undefined {
  const override = (req as any).caseVersionOverride as CaseVersion | undefined
  if (override) return override

  const q = (req.query as any)?.caseVersion as string | string[] | undefined
  const v = Array.isArray(q) ? q[0] : q
  if (v === '1.0' || v === '1.1') return v

  return opts?.default
}

