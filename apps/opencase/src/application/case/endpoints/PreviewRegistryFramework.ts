import type { CredentialRegistryClient } from '../../../infrastructure/http/CredentialRegistryClient'
import { mapCtdlGraphToCasePackage } from '../../../infrastructure/ctdlasn/CtdlAsnToCaseMapper'
import { logger } from '../../../infrastructure/logging/Logger'

export interface RegistryPreviewItem {
  id: string
  fullStatement: string
  codedNotation?: string
  ctdlUri: string
  ctdlCtid: string
}

export interface PreviewRegistryFrameworkResult {
  frameworkTitle: string
  items: RegistryPreviewItem[]
}

export class PreviewRegistryFramework {
  constructor (private readonly registryClient: CredentialRegistryClient) {}

  async execute (cmd: { registryUrl: string }): Promise<PreviewRegistryFrameworkResult> {
    logger.info({ registryUrl: cmd.registryUrl }, 'Previewing framework from Credential Registry')

    const graph = await this.registryClient.fetchGraph(cmd.registryUrl)
    const raw = mapCtdlGraphToCasePackage(graph)

    const frameworkTitle = typeof raw.CFDocument.title === 'string' ? raw.CFDocument.title : 'Unknown Framework'

    const items: RegistryPreviewItem[] = raw.CFItems
      .map((item: Record<string, any>): RegistryPreviewItem | null => {
        const id: string = typeof item.sourcedId === 'string' ? item.sourcedId : typeof item.identifier === 'string' ? item.identifier : ''
        const fullStatement: string = typeof item.fullStatement === 'string' ? item.fullStatement : ''
        if (!id || !fullStatement) return null

        const ext = (item.extensions?.['ext:opencase'] ?? {}) as Record<string, unknown>
        const src = (ext.source ?? {}) as Record<string, unknown>
        const ctdlUri = typeof src.uri === 'string' ? src.uri : ''
        const ctdlCtid = typeof src.ctid === 'string' ? src.ctid : ''
        if (!ctdlUri) return null

        return {
          id,
          fullStatement,
          codedNotation: typeof item.humanCodingScheme === 'string' ? item.humanCodingScheme : undefined,
          ctdlUri,
          ctdlCtid,
        }
      })
      .filter((item): item is RegistryPreviewItem => item !== null)

    logger.info({ frameworkTitle, itemCount: items.length }, 'Registry preview complete')
    return { frameworkTitle, items }
  }
}
