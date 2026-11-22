import { PositionFate } from '../../domain/aggregates/subject-events'
import { generateSlug as generateSubjectSlug } from '../../domain/entities/subject'
import { PrismaTransaction } from '../prisma/client'

/**
 * Drafts are not in the journal: each names its subject and its position by
 * their titles, and finds them again when it is validated. Those still to
 * review that named the subject merged away now name the one that remains,
 * and the position theirs was folded into; a position carried over kept its
 * title. A validated draft is left as it was read.
 */
export async function leadDraftsToSubject(
  tx: PrismaTransaction,
  absorbedId: string,
  keptId: string,
  fates: readonly PositionFate[],
) {
  const absorbed = await tx.subjects.findUniqueOrThrow({
    where: { id: absorbedId },
    select: { slug: true },
  })
  const kept = await tx.subjects.findUniqueOrThrow({
    where: { id: keptId },
    select: { title: true },
  })
  const titleAfter = await foldedTitles(tx, fates)

  const drafts = await tx.draft_statements.findMany({
    where: { status: { not: 'validated' } },
    select: { id: true, subject_title: true, position_title: true },
  })
  // A draft finds its subject by the slug of the title it names, as its validation does
  const concerned = drafts.filter((d) => generateSubjectSlug(d.subject_title) === absorbed.slug)

  for (const positionTitle of Array.from(new Set(concerned.map((d) => d.position_title)))) {
    await tx.draft_statements.updateMany({
      where: {
        id: { in: concerned.filter((d) => d.position_title === positionTitle).map((d) => d.id) },
      },
      data: {
        subject_title: kept.title,
        position_title: titleAfter.get(positionTitle) ?? positionTitle,
      },
    })
  }
}

/** From the title of each position folded away to the title of the position it was folded into */
async function foldedTitles(tx: PrismaTransaction, fates: readonly PositionFate[]) {
  const folds = fates.flatMap((fate) =>
    fate.into ? [{ from: fate.positionId, into: fate.into }] : [],
  )
  const positions = await tx.positions.findMany({
    where: { id: { in: folds.flatMap((fold) => [fold.from, fold.into]) } },
    select: { id: true, title: true },
  })
  const titleOf = new Map(positions.map((p) => [p.id, p.title]))
  return new Map(
    folds.flatMap((fold) => {
      const from = titleOf.get(fold.from)
      const into = titleOf.get(fold.into)
      return from && into ? [[from, into] as const] : []
    }),
  )
}
