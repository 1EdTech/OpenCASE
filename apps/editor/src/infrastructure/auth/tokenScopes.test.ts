import { describe, expect, it } from 'vitest'
import { tokenHasCaseOwner, decodeJwtPayload } from './tokenScopes'

function makeToken (payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.sig`
}

describe('tokenScopes', () => {
  it('detects case.owner from scope claim', () => {
    expect(tokenHasCaseOwner(makeToken({ scope: 'case.read case.owner' }))).toBe(true)
  })

  it('detects admin membership role as tenant admin', () => {
    expect(tokenHasCaseOwner(makeToken({
      resource_access: { 'tenant-demo': { roles: ['admin'] } },
    }))).toBe(true)
  })

  it('detects case.owner from resource_access roles', () => {
    expect(tokenHasCaseOwner(makeToken({
      resource_access: { 'tenant-demo': { roles: ['case.owner'] } },
    }))).toBe(true)
  })

  it('returns false for author-only tokens', () => {
    expect(tokenHasCaseOwner(makeToken({ scope: 'case.read case.write author' }))).toBe(false)
  })

  it('detects case.admin (system admin) as tenant admin for UI', () => {
    expect(tokenHasCaseOwner(makeToken({
      resource_access: { 'tenant-system': { roles: ['case.admin'] } },
    }))).toBe(true)
  })
})
