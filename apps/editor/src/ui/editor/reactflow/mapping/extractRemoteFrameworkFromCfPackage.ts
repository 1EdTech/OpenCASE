import type { CFPackage } from '@/domain/case/types'
import type { LinkedFrameworkRef, RemoteItemLink } from '@/ui/editor/remoteFramework/remoteFrameworkTypes'
import { nextRemoteFrameworkColor } from '@/ui/editor/remoteFramework/remoteFrameworkTypes'

const OPENCASE_EXT_KEY = 'ext:opencase'

export type ExtractedRemoteFrameworkData = {
  linkedFrameworks: LinkedFrameworkRef[]
  remoteItemLinks: RemoteItemLink[]
}

export function extractRemoteFrameworkDataFromCfPackage(cfPackage: CFPackage): ExtractedRemoteFrameworkData {
  const docExtensions = cfPackage.CFDocument?.extensions as Record<string, unknown> | undefined
  const ext = docExtensions?.[OPENCASE_EXT_KEY] as {
    linkedFrameworks?: LinkedFrameworkRef[]
    remoteItemLinks?: RemoteItemLink[]
  } | undefined

  return {
    linkedFrameworks: Array.isArray(ext?.linkedFrameworks) ? ext!.linkedFrameworks : [],
    remoteItemLinks: Array.isArray(ext?.remoteItemLinks) ? ext!.remoteItemLinks : [],
  }
}

/** Assign colors to linked frameworks that lack one. */
export function normalizeLinkedFrameworkColors(refs: LinkedFrameworkRef[]): LinkedFrameworkRef[] {
  return refs.map((ref, i) => ({
    ...ref,
    color: ref.color || nextRemoteFrameworkColor(i),
  }))
}
