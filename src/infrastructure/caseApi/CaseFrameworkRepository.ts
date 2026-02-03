import type { FrameworkRepository } from '@/application/framework/ports/FrameworkRepository'
import type { CFAssociation, CFItem } from '@/domain/case/types'
import type { Association, AssociationType, FrameworkMetadata, Item, ItemType } from '@/domain/framework/model/types'
import type { Framework } from '@/domain/framework/model/types'
import type { FrameworkId } from '@/domain/shared/types'
import type { CaseApiClient } from './CaseApiClient'

export class CaseFrameworkRepository implements FrameworkRepository {
  constructor(private readonly _client: CaseApiClient) {}

  private mapItemType(cfItem: CFItem): ItemType {
    const raw = (cfItem.CFItemType ?? '').toLowerCase()
    if (raw.includes('skill')) return 'Skill'
    if (raw.includes('learning') || raw.includes('outcome')) return 'LearningOutcome'
    if (raw.includes('standard')) return 'Standard'
    if (raw.includes('compet')) return 'Competency'
    return 'Competency'
  }

  private mapAssociationType(assoc: CFAssociation): AssociationType {
    const t = (assoc.associationType ?? '').toLowerCase()
    if (t === 'ischildof') return 'isChildOf'
    if (t === 'ispartof') return 'isPartOf'
    return 'isRelatedTo'
  }

  async getById(id: FrameworkId): Promise<Framework | null> {
    // Note: CASE read-side tenant is derived from token in OpenCASE.
    const pkg = await this._client.getCfPackage({ docId: id as unknown as string, caseVersion: 'v1p1' })

    const doc = pkg.CFDocument
    const metadata: FrameworkMetadata = { title: doc.title, description: doc.description }

    const items: Framework['items'] = new Map()
    for (const it of pkg.CFItems ?? []) {
      const item: Item = {
        id: it.identifier as unknown as Item['id'],
        statement: it.fullStatement,
        type: this.mapItemType(it),
        metadata: it.extensions ?? undefined,
      }
      items.set(item.id, item)
    }

    const associations: Framework['associations'] = new Map()
    for (const a of pkg.CFAssociations ?? []) {
      const fromId = a.originNodeURI?.identifier
      const toId = a.destinationNodeURI?.identifier
      if (!fromId || !toId) continue

      const assoc: Association = {
        id: a.identifier as unknown as Association['id'],
        fromItemId: fromId as unknown as Association['fromItemId'],
        toItemId: toId as unknown as Association['toItemId'],
        associationType: this.mapAssociationType(a),
        metadata: a.extensions ?? undefined,
      }
      associations.set(assoc.id, assoc)
    }

    const framework: Framework = {
      id,
      metadata,
      items,
      associations,
      status: 'Published',
    }

    return framework
  }

  async saveDraft(_framework: Framework): Promise<void> {
    // Placeholder: implement via authoring API later.
  }

  async publish(_frameworkId: FrameworkId): Promise<void> {
    // Placeholder: implement publish endpoint later.
  }
}

