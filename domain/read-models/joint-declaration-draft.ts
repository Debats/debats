import { DraftAuthor, DraftStatement } from '../entities/draft-statement'
import { DraftResolution, ResolvedAuthor } from '../use-cases/resolve-draft'
import { ReviewableDraft } from './chantier-sections'

/** A position the drafts say the text takes, with the sentence of the text that states it */
export type DraftedPosition = {
  subjectTitle: string
  positionTitle: string
  /** The words of the text on this subject; null when the draft that brings the position has none */
  quote: string | null
  subject: DraftResolution['subject']
  position: DraftResolution['position']
  subjectData: DraftStatement['subjectData']
  positionData: DraftStatement['positionData']
}

/** Someone the drafts say signed the text: known to the site, or created by the validation */
export type DraftedSignatory = {
  author: DraftAuthor
  resolution: ResolvedAuthor
}

/**
 * A joint declaration as its pending drafts draw it. A draft is one
 * signatory on one position; the text is every position the drafts bring,
 * signed by everyone they name — which is what validating them all gives,
 * since signing is signing everything.
 */
export type JointDeclarationDraft = {
  title: string
  presentation: string | null
  sourceName: string
  sourceUrl: string
  date: string
  positions: DraftedPosition[]
  signatories: DraftedSignatory[]
  /** The drafts the declaration is read from, in the order they were given */
  items: ReviewableDraft[]
  canValidate: boolean
}

export type DraftedDeclarations = {
  declarations: JointDeclarationDraft[]
  /** The drafts that sign nothing, in the order they were given */
  others: ReviewableDraft[]
}

const sameAuthor = (a: DraftAuthor, b: DraftAuthor) => a.kind === b.kind && a.name === b.name

function positionsOf(items: ReviewableDraft[]): DraftedPosition[] {
  const positions: DraftedPosition[] = []
  for (const { draft, resolution } of items) {
    const known = positions.some(
      (position) =>
        position.subjectTitle === draft.subjectTitle &&
        position.positionTitle === draft.positionTitle,
    )
    if (known) continue
    positions.push({
      subjectTitle: draft.subjectTitle,
      positionTitle: draft.positionTitle,
      quote: draft.content.kind === 'declaration' ? draft.content.quote : null,
      subject: resolution.subject,
      position: resolution.position,
      subjectData: draft.subjectData,
      positionData: draft.positionData,
    })
  }
  return positions
}

function signatoriesOf(items: ReviewableDraft[]): DraftedSignatory[] {
  const signatories: DraftedSignatory[] = []
  for (const { draft, resolution } of items) {
    if (signatories.some(({ author }) => sameAuthor(author, draft.author))) continue
    signatories.push({ author: draft.author, resolution: resolution.author })
  }
  return signatories
}

function declarationOf(items: ReviewableDraft[]): JointDeclarationDraft {
  const [{ draft: first }] = items
  return {
    title: first.jointDeclaration?.title ?? '',
    presentation:
      items.map(({ draft }) => draft.jointDeclaration?.presentation).find(Boolean) ?? null,
    sourceName: first.sourceName,
    sourceUrl: first.sourceUrl,
    date: first.date,
    positions: positionsOf(items),
    signatories: signatoriesOf(items),
    items,
    canValidate: items.every(({ resolution }) => resolution.canValidate),
  }
}

/**
 * The joint declarations a set of drafts draws, apart from the drafts that
 * sign nothing. The signatures of one text are gathered by the page it is
 * read on, as their validation gathers them: the same source is the same
 * text, whatever title each draft gives it, and the first title names it.
 */
export function draftedDeclarations(items: ReviewableDraft[]): DraftedDeclarations {
  const bySource = new Map<string, ReviewableDraft[]>()
  const others: ReviewableDraft[] = []
  for (const item of items) {
    if (!item.draft.jointDeclaration) {
      others.push(item)
      continue
    }
    const { sourceUrl } = item.draft
    bySource.set(sourceUrl, [...(bySource.get(sourceUrl) ?? []), item])
  }
  return { declarations: Array.from(bySource.values(), declarationOf), others }
}
