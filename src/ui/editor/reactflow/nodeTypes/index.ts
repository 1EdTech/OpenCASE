import type { NodeTypes } from '@xyflow/react'
import CaseItemNode from './CaseItemNode'
import CaseFrameworkNode from './CaseFrameworkNode'
import ExternalFrameworkNode from './ExternalFrameworkNode'

export const nodeTypes: NodeTypes = {
  caseItemNode: CaseItemNode,
  caseFrameworkNode: CaseFrameworkNode,
  externalFrameworkNode: ExternalFrameworkNode,
}

