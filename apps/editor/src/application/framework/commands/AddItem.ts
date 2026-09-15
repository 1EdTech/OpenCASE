import type { Command } from '@/application/shared/CommandBus'
import type { FrameworkId, ItemId } from '@/domain/shared/types'
import type { ItemType } from '@/domain/framework/model/types'

export type AddItem = Command<
  'framework/addItem',
  {
    frameworkId: FrameworkId
    itemId: ItemId
    statement: string
    type?: ItemType
  }
>

