/** MIME type for drag-and-drop of remote CFItems from the browse panel. */
export const REMOTE_ITEM_MIME = 'application/x-opencase-remote-item'

export const REMOTE_FRAMEWORK_COLORS = [
  '#0ea5e9', // sky
  '#d97706', // amber
  '#059669', // emerald
  '#7c3aed', // violet
  '#db2777', // pink
  '#0891b2', // cyan
  '#ca8a04', // yellow
  '#dc2626', // red
] as const

export type SidePanelMode = 'closed' | 'properties' | 'cgeSearch' | 'remoteItems'

export type LinkedFrameworkRef = {
  id: string
  cgeFrameworkId: string
  cacheDocId: string
  title: string
  color: string
  sourceUri?: string
  nodePosition?: { x: number; y: number }
  itemCount?: number
  cachedAt?: string
  /** When true, publisher fetches omit the CGE bearer token (open CASE servers). */
  skipPublisherAuth?: boolean
  /** Last cache download/refresh error, if any. */
  cacheError?: string
}

export type RemoteItemLink = {
  id: string
  localItemId: string
  remoteItemUri: string
  remoteItemIdentifier: string
  remoteFrameworkRefId: string
  associationType: string
  remoteLabel: string
  remoteHumanCodingScheme?: string
  remoteFrameworkTitle?: string
  remoteFrameworkColor?: string
  cfAssociationId?: string
}

export type RemoteItemDragPayload = {
  identifier: string
  uri?: string
  label: string
  humanCodingScheme?: string
  remoteFrameworkRefId: string
  remoteFrameworkNodeId: string
  remoteFrameworkTitle: string
  remoteFrameworkColor: string
}

export function nextRemoteFrameworkColor(index: number): string {
  return REMOTE_FRAMEWORK_COLORS[index % REMOTE_FRAMEWORK_COLORS.length] ?? REMOTE_FRAMEWORK_COLORS[0]
}

export function parseRemoteItemDragPayload(data: string): RemoteItemDragPayload | null {
  try {
    const parsed = JSON.parse(data) as RemoteItemDragPayload
    if (!parsed?.identifier || !parsed.remoteFrameworkRefId) return null
    return parsed
  } catch {
    return null
  }
}
