import { describe, expect, it } from 'vitest'
import { buildRemoteLinkEdges } from './buildRemoteLinkGraph'
import type { RemoteItemLink } from './remoteFrameworkTypes'
import type { ExternalFrameworkNodeType } from '@/ui/editor/reactflow/types'

describe('buildRemoteLinkGraph', () => {
  const extNode: ExternalFrameworkNodeType = {
    id: 'ext_fw1',
    type: 'externalFrameworkNode',
    position: { x: 500, y: 100 },
    style: { width: 280, height: 120 },
    data: {
      refId: 'fw1',
      title: 'Remote FW',
      color: '#0ea5e9',
    },
  }

  const link: RemoteItemLink = {
    id: 'link1',
    localItemId: 'item1',
    remoteItemUri: 'urn:case:item:remote1',
    remoteItemIdentifier: 'remote1',
    remoteFrameworkRefId: 'fw1',
    associationType: 'isRelatedTo',
    remoteLabel: 'Remote statement',
    remoteHumanCodingScheme: 'R.1',
    remoteFrameworkColor: '#0ea5e9',
  }

  it('creates edges from local item to external framework node', () => {
    const localItem = {
      id: 'item1',
      type: 'caseItemNode' as const,
      position: { x: 0, y: 0 },
      data: { cfItem: { identifier: 'item1', uri: 'urn:case:item:item1' } },
    }
    const edges = buildRemoteLinkEdges([localItem, extNode], [link])
    expect(edges).toHaveLength(1)
    expect(edges[0]?.type).toBe('remoteLink')
    expect(edges[0]?.source).toBe('item1')
    expect(edges[0]?.target).toBe('ext_fw1')
    expect(edges[0]?.style?.stroke).toBe('#0ea5e9')
  })

  it('skips edges when external framework node is missing', () => {
    const localItem = {
      id: 'item1',
      type: 'caseItemNode' as const,
      position: { x: 0, y: 0 },
      data: { cfItem: { identifier: 'item1', uri: 'urn:case:item:item1' } },
    }
    const edges = buildRemoteLinkEdges([localItem], [link])
    expect(edges).toHaveLength(0)
  })
})
