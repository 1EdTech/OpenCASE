import type { Item, ItemType } from './types'
import type { ItemId } from '@/domain/shared/types'

export function createItem(params: { id: ItemId; statement: string; type?: ItemType }): Item {
  return {
    id: params.id,
    statement: params.statement,
    type: params.type,
  }
}

