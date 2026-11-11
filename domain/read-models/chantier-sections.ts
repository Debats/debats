import { DraftStatement } from '../entities/draft-statement'
import { DraftResolution } from '../use-cases/resolve-draft'

/** A draft as the review reads it: with what the site knows of what it names */
export type ReviewableDraft = {
  draft: DraftStatement
  resolution: DraftResolution
}

/** A section of a chantier's drafts, as the agent named it or as the site made it */
export type ChantierSection = {
  title: string
  items: ReviewableDraft[]
}

/** Where a draft without a section goes when the agent ranged the others */
export const UNSECTIONED = 'Sans section'

const collator = new Intl.Collator('fr')

/** Related drafts side by side: by subject, then by position, keeping the given order otherwise */
const byTopic = (a: ReviewableDraft, b: ReviewableDraft) =>
  collator.compare(a.draft.subjectTitle, b.draft.subjectTitle) ||
  collator.compare(a.draft.positionTitle, b.draft.positionTitle)

const sorted = (items: ReviewableDraft[]) => [...items].sort(byTopic)

/**
 * The sections of a chantier's drafts, in reading order.
 *
 * The agent decides them: each draft names its section, and the chantier
 * lists the titles in the order it wants them read; a section it did not
 * list comes after, in alphabetical order, and drafts it left without one
 * come last. Until the agent ranges anything, the site ranges by what a
 * validation would change on the map: nothing (the subject and the position
 * are there), a new position on a known subject, or a new subject, one
 * section per subject. That default is the guideline the agent is given.
 */
export function chantierSections(items: ReviewableDraft[], declared: string[]): ChantierSection[] {
  const ranged = declared.length > 0 || items.some(({ draft }) => draft.section !== null)
  return (ranged ? agentSections(items, declared) : guidelineSections(items)).filter(
    ({ items }) => items.length > 0,
  )
}

function agentSections(items: ReviewableDraft[], declared: string[]): ChantierSection[] {
  const under = new Map<string, ReviewableDraft[]>()
  for (const item of items) {
    const title = item.draft.section ?? UNSECTIONED
    under.set(title, [...(under.get(title) ?? []), item])
  }
  const undeclared = Array.from(under.keys())
    .filter((title) => !declared.includes(title) && title !== UNSECTIONED)
    .sort(collator.compare)
  return [...declared, ...undeclared, UNSECTIONED].map((title) => ({
    title,
    items: sorted(under.get(title) ?? []),
  }))
}

function guidelineSections(items: ReviewableDraft[]): ChantierSection[] {
  const ready = items.filter(
    ({ resolution }) => resolution.subject.found && resolution.position.found,
  )
  const newPositions = items.filter(
    ({ resolution }) => resolution.subject.found && !resolution.position.found,
  )
  const newSubjects = new Map<string, ReviewableDraft[]>()
  for (const item of items.filter(({ resolution }) => !resolution.subject.found)) {
    const title = item.draft.subjectTitle
    newSubjects.set(title, [...(newSubjects.get(title) ?? []), item])
  }
  return [
    { title: 'Tout est déjà là', items: sorted(ready) },
    { title: 'Nouvelles positions', items: sorted(newPositions) },
    ...Array.from(newSubjects.entries())
      .sort(([a], [b]) => collator.compare(a, b))
      .map(([title, drafts]) => ({ title: `Nouveau sujet : ${title}`, items: sorted(drafts) })),
  ]
}
