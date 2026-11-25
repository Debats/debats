/**
 * A pair of two things named by their id, the same pair whichever is named
 * first: the smaller id always comes first, as the tables that hold pairs
 * require (`position_judgements`, `related_subjects`).
 */
export const orderedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a])
