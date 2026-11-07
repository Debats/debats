/**
 * A text that holds nothing is absent, not empty.
 *
 * The spaces around a link or an acronym are not part of it, and a field made
 * of spaces was never filled in. A fact that recorded `'   '` would make the
 * entity hold `Some('')`, and the page would then render a link to nowhere —
 * so the normalisation belongs to the fact, before anything is written, and
 * not to the commands that happen to pass through.
 */
export const blankToUndefined = (value: string | undefined): string | undefined =>
  value?.trim() ? value.trim() : undefined
