import { describe, expect, it, vi } from 'vitest'
import { ensureDefaultMembership } from './ensureDefaultMembership'

describe('ensureDefaultMembership', () => {
  it('refreshes the access token when the default role was assigned', async () => {
    const api = { ensureSelfMembership: vi.fn().mockResolvedValue({ status: 'assigned', role: 'author' }) }
    const refreshAccessToken = vi.fn().mockResolvedValue(undefined)

    await ensureDefaultMembership(api, 'system', refreshAccessToken)

    expect(api.ensureSelfMembership).toHaveBeenCalledWith({ tenantId: 'system' })
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('leaves the access token alone when nothing changed', async () => {
    const api = { ensureSelfMembership: vi.fn().mockResolvedValue({ status: 'unchanged', role: 'viewer' }) }
    const refreshAccessToken = vi.fn().mockResolvedValue(undefined)

    await ensureDefaultMembership(api, 'system', refreshAccessToken)

    expect(refreshAccessToken).not.toHaveBeenCalled()
  })
})
