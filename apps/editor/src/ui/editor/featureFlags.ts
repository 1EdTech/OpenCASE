/**
 * Canvas View (React Flow) is hidden for now, leaving Tree View as the only
 * editor view. The canvas code is kept intact so it can be revisited later.
 *
 * When false, React Flow is never mounted and the canvas-only edge
 * derivations in EditorCanvas are skipped, so the hidden canvas costs nothing
 * per keystroke. Flip to true to restore the Canvas/Tree View menu items.
 */
export const CANVAS_VIEW_ENABLED = false
