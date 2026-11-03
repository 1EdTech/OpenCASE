import type { Association, AssociationType, Framework } from '@/domain/framework/model/types'

/**
 * Edits to a framework's inline associations to other frameworks, made in the
 * Tree View. These associations aren't canvas edges, so they never enter the
 * editor graph: the edits are kept alongside it and applied to the framework
 * when it's saved.
 *
 * Every edit is idempotent, so applying them again to a framework that already
 * has them (e.g. after a save) changes nothing.
 */
export type InlineAlignmentEdits = {
  added: Association[]
  removedIds: string[]
  /** association id → new associationType */
  typeChanges: Record<string, string>
}

export const NO_INLINE_ALIGNMENT_EDITS: InlineAlignmentEdits = { added: [], removedIds: [], typeChanges: {} }

export function addInlineAlignment(edits: InlineAlignmentEdits, association: Association): InlineAlignmentEdits {
  return { ...edits, added: [...edits.added.filter((a) => a.id !== association.id), association] }
}

export function removeInlineAlignment(edits: InlineAlignmentEdits, id: string): InlineAlignmentEdits {
  const wasAdded = edits.added.some((a) => String(a.id) === id)
  const { [id]: _dropped, ...typeChanges } = edits.typeChanges
  return {
    added: wasAdded ? edits.added.filter((a) => String(a.id) !== id) : edits.added,
    // An association added in this session was never saved, so dropping it is enough.
    removedIds: wasAdded || edits.removedIds.includes(id) ? edits.removedIds : [...edits.removedIds, id],
    typeChanges,
  }
}

export function changeInlineAlignmentType(edits: InlineAlignmentEdits, id: string, associationType: string): InlineAlignmentEdits {
  if (edits.added.some((a) => String(a.id) === id)) {
    return {
      ...edits,
      added: edits.added.map((a) => (String(a.id) === id ? { ...a, associationType: associationType as AssociationType } : a)),
    }
  }
  return { ...edits, typeChanges: { ...edits.typeChanges, [id]: associationType } }
}

export function hasInlineAlignmentEdits(edits: InlineAlignmentEdits): boolean {
  return edits.added.length > 0 || edits.removedIds.length > 0 || Object.keys(edits.typeChanges).length > 0
}

export function applyInlineAlignmentEdits(framework: Framework, edits: InlineAlignmentEdits): Framework {
  if (!hasInlineAlignmentEdits(edits)) return framework
  const associations = new Map(framework.associations)
  for (const id of edits.removedIds) associations.delete(id as Association['id'])
  for (const [id, associationType] of Object.entries(edits.typeChanges)) {
    const existing = associations.get(id as Association['id'])
    if (existing) associations.set(existing.id, { ...existing, associationType: associationType as AssociationType })
  }
  for (const a of edits.added) associations.set(a.id, a)
  return { ...framework, associations }
}
