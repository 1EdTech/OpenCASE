import type { CaseApiClient } from '@/infrastructure/caseApi/CaseApiClient'

/**
 * First login: ask the server to give the signed-in user the default role, and refresh
 * their own access token when it did, so the new role applies without signing in again.
 */
export async function ensureDefaultMembership (
  api: Pick<CaseApiClient, 'ensureSelfMembership'>,
  tenantId: string,
  refreshAccessToken: () => Promise<void>,
): Promise<void> {
  const result = await api.ensureSelfMembership({ tenantId })
  if (result.status === 'assigned') await refreshAccessToken()
}
