import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import {
  absorbSubject,
  followMergedSubject,
  mergeSubjectInto,
  positionAfter,
  SubjectState,
} from '../aggregates/subject'
import { PositionFate } from '../aggregates/subject-events'
import { followEngagedSubject } from '../aggregates/joint-declaration'
import { followSubject } from '../aggregates/statement'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { JointDeclarationRepository } from '../repositories/joint-declaration-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { decideOnEachJointDeclaration } from './joint-declaration-stream'
import { ContributorIdentity, Rejected } from './types'
import { allowedTo, decoded } from './preconditions'
import { closeReviewOfMerged } from './record-correction'
import { decideOnSubject, subjectAsItStands } from './subject-stream'
import { decideOnEachStatement } from './statement-stream'

const SubjectsMergeInput = S.Struct({
  /** The subject that disappears, and the revision of its stream the page showed */
  sourceSubjectId: S.String,
  sourceRevision: S.Number,
  /** The subject that remains, and the revision of its stream the page showed */
  targetSubjectId: S.String,
  targetRevision: S.Number,
  /** What becomes of each position of the subject that disappears */
  positions: S.Array(PositionFate),
})

/** What the merge page sends: both subjects as it showed them, and the fate of each position */
export type SubjectsMerge = S.Schema.Encoded<typeof SubjectsMergeInput>

type MergeSubjectsParams = SubjectsMerge & { contributor: ContributorIdentity | null }

/** Read side: which statements stand on the subject that disappears, which joint declarations engage either */
const statements = Effect.serviceFunctions(StatementRepository)
const declarations = Effect.serviceFunctions(JointDeclarationRepository)

/**
 * Folds a duplicate subject into the one that should remain. The target
 * records what it took in (the positions carried over, the themes and the
 * links it lacked), the source where it went and what became of each of its
 * positions, every subject linked to the source that its link now leads to
 * the target, and every statement of the source its new subject and
 * position, each in its own stream. Both subjects are taken at the revision
 * the page showed: the fates were chosen on those positions. The statements
 * are read before the transaction: one added in between would stay behind.
 */
export function mergeSubjectsUseCase(params: MergeSubjectsParams) {
  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'merge_subjects', 'fusionner des sujets'),
      merge: decoded(SubjectsMergeInput)(params),
    }),
    Effect.filterOrFail(
      ({ merge }) => merge.sourceSubjectId !== merge.targetSubjectId,
      () => new Rejected('Un sujet ne peut pas être fusionné avec lui-même.'),
    ),
    Effect.bind('statementIds', ({ merge }) =>
      statements.findIdsBySubjectId(merge.sourceSubjectId),
    ),
    Effect.bind('declarationIds', ({ merge }) => declarationsFollowing(merge)),
    Effect.flatMap(({ contributor, merge, statementIds, declarationIds }) =>
      runUnitOfWork((events) =>
        recordMerge(events, contributor.id, merge, statementIds, declarationIds),
      ),
    ),
  )
}

type Merge = S.Schema.Type<typeof SubjectsMergeInput>

export const TEXT_ENGAGES_BOTH =
  'Une déclaration commune prend position sur les deux sujets : elle en prendrait deux sur celui qui reste. Retirez d’abord l’une de ses positions.'

/**
 * The joint declarations that engage the subject that disappears: they follow
 * it. One that also engages the subject that remains would speak twice on it,
 * which a text never does — the merge is refused.
 */
const declarationsFollowing = ({ sourceSubjectId, targetSubjectId }: Merge) =>
  pipe(
    Effect.all({
      onSource: declarations.findIdsBySubjectId(sourceSubjectId),
      onTarget: declarations.findIdsBySubjectId(targetSubjectId),
    }),
    Effect.filterOrFail(
      ({ onSource, onTarget }) => !onSource.some((id) => onTarget.includes(id)),
      () => new Rejected(TEXT_ENGAGES_BOTH),
    ),
    Effect.map(({ onSource }) => onSource),
  )

function recordMerge(
  events: EventStore,
  actorId: string,
  merge: Merge,
  statementIds: readonly string[],
  declarationIds: readonly string[],
) {
  const { sourceSubjectId, targetSubjectId, positions } = merge
  return pipe(
    subjectAsItStands(events, sourceSubjectId, merge.sourceRevision),
    Effect.bindTo('absorbed'),
    Effect.bind('kept', ({ absorbed }) =>
      decideOnSubject(
        events,
        targetSubjectId,
        actorId,
        absorbSubject(absorbed.state, positions),
        merge.targetRevision,
      ),
    ),
    Effect.tap(() =>
      decideOnSubject(
        events,
        sourceSubjectId,
        actorId,
        mergeSubjectInto(targetSubjectId, positions),
      ),
    ),
    Effect.tap(({ absorbed }) => leadLinkedSubjects(events, actorId, absorbed.state, merge)),
    Effect.tap(() =>
      decideOnEachStatement(
        events,
        statementIds,
        actorId,
        followSubject(targetSubjectId, positionAfter(positions)),
      ),
    ),
    // A joint declaration that engaged the source engages the target: its next signatory will
    Effect.tap(() =>
      decideOnEachJointDeclaration(
        events,
        declarationIds,
        actorId,
        followEngagedSubject(sourceSubjectId, targetSubjectId, positionAfter(positions)),
      ),
    ),
    // What is gone takes its open flags with it: the subject, and each position folded
    Effect.tap(() =>
      closeReviewOfMerged(events, actorId, { type: 'subject', id: sourceSubjectId }),
    ),
    Effect.tap(() =>
      Effect.forEach(
        positions.filter((fate) => fate.into !== undefined),
        (fate) => closeReviewOfMerged(events, actorId, { type: 'position', id: fate.positionId }),
        { discard: true },
      ),
    ),
    // The subject that remains: the caller leads the contributor to its page
    Effect.map(({ kept }) => kept.state.subject),
  )
}

/** A link is symmetric: each subject linked to the source records where its link now leads */
function leadLinkedSubjects(
  events: EventStore,
  actorId: string,
  absorbed: SubjectState,
  { sourceSubjectId, targetSubjectId }: Merge,
) {
  return Effect.forEach(
    absorbed.relatedSubjectIds.filter((id) => id !== targetSubjectId),
    (linkedId) =>
      pipe(
        decideOnSubject(
          events,
          linkedId,
          actorId,
          followMergedSubject(sourceSubjectId, targetSubjectId),
        ),
        // One deleted meanwhile has no link left to lead anywhere
        Effect.catchTag('NotFound', () => Effect.void),
      ),
    { discard: true },
  )
}
