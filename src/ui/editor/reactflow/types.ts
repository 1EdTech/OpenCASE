import type { Node } from '@xyflow/react'
import type { CFDocument, CFItem } from '@/domain/case/types'

export type CaseItemNodeData = {
  cfItem: CFItem
  parentId?: string
  onAddChild?: (_parentId: string) => void
  onUpdateItem?: (_nodeId: string, _patch: Partial<CFItem>) => void
}

export type CaseItemNodeType = Node<CaseItemNodeData, 'caseItemNode'>

export type CaseFrameworkNodeData = {
  cfDocument: CFDocument
  onAddChild?: (_frameworkNodeId: string) => void
  onUpdateDocument?: (_nodeId: string, _patch: Partial<CFDocument>) => void
}

export type CaseFrameworkNodeType = Node<CaseFrameworkNodeData, 'caseFrameworkNode'>

export type CaseEditorNodeData = CaseItemNodeData | CaseFrameworkNodeData
export type CaseEditorNodeType = CaseItemNodeType | CaseFrameworkNodeType

export type CaseItemNodeDataPatch = Partial<Omit<CaseItemNodeData, 'cfItem'>> & {
  cfItem?: Partial<CFItem>
}

export type CaseFrameworkNodeDataPatch = Partial<Omit<CaseFrameworkNodeData, 'cfDocument'>> & {
  cfDocument?: Partial<CFDocument>
}

export type CaseEditorNodeDataPatch = CaseItemNodeDataPatch | CaseFrameworkNodeDataPatch
