/**
 * Pure reducer for the CASE editor state.
 *
 * No React dependency -- easily unit-testable:
 *   expect(editorReducer(state, action)).toEqual(...)
 */
import type {
  CaseEditorEdge,
  CaseEditorNodeDataPatch,
  CaseEditorNodeType,
  CaseItemNodeType,
} from '@/ui/editor/state/graphTypes'
import { FRAMEWORK_ROOT_ASSOCIATION_TYPE, isFrameworkNode, isItemNode } from '@/ui/editor/state/graphTypes'
import type { CFItem } from '@/domain/case/types'
import type { EditorGraph } from '@/ui/editor/state/editorFactories'
import type { Association } from '@/domain/framework/model/types'
import {
  NO_INLINE_ALIGNMENT_EDITS,
  addInlineAlignment,
  changeInlineAlignmentType,
  removeInlineAlignment,
  type InlineAlignmentEdits,
} from '@/domain/framework/inlineAlignmentEdits'

// ── State ──────────────────────────────────────────────────────────────

export type EditorState = {
  nodes: CaseEditorNodeType[]
  edges: CaseEditorEdge[]
  /** Tree View edits to the framework's inline associations to other frameworks (not graph edges) */
  inlineAlignmentEdits: InlineAlignmentEdits
  selectedNodeId: string | null
  dirty: boolean
}

// ── Actions ────────────────────────────────────────────────────────────

export type Action =
  | { type: 'selection/setNode'; nodeId: string | null }
  | { type: 'selection/clear' }
  | { type: 'node/updateData'; nodeId: string; patch: CaseEditorNodeDataPatch }
  | { type: 'node/addChild'; parentId: string; childId: string; cfItem: CFItem }
  | { type: 'inlineAlignment/add'; association: Association }
  | { type: 'inlineAlignment/remove'; associationId: string }
  | { type: 'inlineAlignment/updateType'; associationId: string; associationType: string }
  | { type: 'inlineAlignment/clearEdits' }
  | { type: 'graph/load'; graph: EditorGraph }
  | { type: 'dirty/mark' }
  | { type: 'dirty/clear' }

// ── Reducer ────────────────────────────────────────────────────────────

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'selection/setNode':
      return state.selectedNodeId === action.nodeId ? state : { ...state, selectedNodeId: action.nodeId }
    case 'selection/clear':
      return state.selectedNodeId === null ? state : { ...state, selectedNodeId: null }
    case 'node/updateData': {
      const { nodeId, patch } = action
      const nodes = state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        if (isItemNode(n) && 'cfItem' in patch && patch.cfItem) {
          return { ...n, data: { ...n.data, ...patch, cfItem: { ...n.data.cfItem, ...patch.cfItem } } }
        }
        if (isFrameworkNode(n) && 'cfDocument' in patch && patch.cfDocument) {
          return { ...n, data: { ...n.data, ...patch, cfDocument: { ...n.data.cfDocument, ...patch.cfDocument } } }
        }
        return n
      })
      return { ...state, nodes, dirty: true }
    }
    case 'node/addChild': {
      const parent = state.nodes.find((n) => n.id === action.parentId)
      if (!parent) return state
      const childId = action.childId
      const isParentFramework = isFrameworkNode(parent)

      const childNode: CaseItemNodeType = {
        id: childId,
        type: 'caseItemNode',
        data: { cfItem: action.cfItem, parentId: action.parentId },
      }

      const edge: CaseEditorEdge = {
        id: `e_${action.parentId}_${childId}`,
        source: action.parentId,
        target: childId,
        data: {
          isHierarchical: true,
          associationType: isParentFramework ? FRAMEWORK_ROOT_ASSOCIATION_TYPE : 'isChildOf',
          semanticOrigin: childId,
          semanticDestination: action.parentId,
          isFrameworkRootConnection: isParentFramework,
        },
      }

      return { ...state, nodes: [...state.nodes, childNode], edges: [...state.edges, edge], selectedNodeId: childId, dirty: true }
    }
    case 'inlineAlignment/add': {
      return { ...state, inlineAlignmentEdits: addInlineAlignment(state.inlineAlignmentEdits, action.association), dirty: true }
    }
    case 'inlineAlignment/remove': {
      return { ...state, inlineAlignmentEdits: removeInlineAlignment(state.inlineAlignmentEdits, action.associationId), dirty: true }
    }
    case 'inlineAlignment/updateType': {
      return {
        ...state,
        inlineAlignmentEdits: changeInlineAlignmentType(state.inlineAlignmentEdits, action.associationId, action.associationType),
        dirty: true,
      }
    }
    case 'inlineAlignment/clearEdits': {
      // Once saved, the edits are part of the loaded framework.
      return { ...state, inlineAlignmentEdits: NO_INLINE_ALIGNMENT_EDITS }
    }
    case 'graph/load': {
      return {
        nodes: action.graph.nodes,
        edges: action.graph.edges,
        inlineAlignmentEdits: NO_INLINE_ALIGNMENT_EDITS,
        selectedNodeId: null,
        dirty: false,
      }
    }
    case 'dirty/mark': {
      return state.dirty ? state : { ...state, dirty: true }
    }
    case 'dirty/clear': {
      return { ...state, dirty: false }
    }
    default:
      return state
  }
}
