/**
 * The existing one that was chosen, in the shape a `Combobox` takes back.
 *
 * The id alone is not enough, and that is the whole point of this file: the
 * Combobox unmounts while the creation panel is up, and on cancel it must
 * come back on what was chosen rather than empty — otherwise the form carries
 * an entity it no longer shows. The field is `label` and not `name` or
 * `title` so that what the hook holds is passed to `initialItem` as it is,
 * with nothing to map and so nothing to forget.
 */
export interface Chosen {
  id: string
  label: string
}

/**
 * One side of the contribution form in one of its two states: an entity
 * chosen among the site's own, or a new one being typed. Never both — the
 * hook that owns it derives the command's input from that.
 *
 * Shared because the three sides that have this shape — a personality, an
 * organisation, a subject — were written at three different moments, and the
 * same defect was fixed in one and missed in the next four times over. Three
 * comments did not prevent the fourth; a type that only compiles when the
 * whole choice is handed back does.
 *
 * The position of a subject is deliberately not one of these: it is ticked
 * from a list already loaded, not searched in a field, so it has no choice to
 * come back on and would only borrow the shape's words.
 */
export interface ExistingOrNew<Draft> {
  chosen?: Chosen
  choose: (chosen?: Chosen) => void
  /** True while a new one is being described instead of one being chosen */
  creating: boolean
  startNew: () => void
  /**
   * Back to choosing, and back to the choice made before. What was typed
   * stays: cancelling means « let me look at the existing ones again », not
   * « throw away what I wrote ».
   */
  cancelNew: () => void
  draft: Draft
  change: (draft: Draft) => void
}
