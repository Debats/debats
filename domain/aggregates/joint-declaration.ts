import { Either } from 'effect'
import {
  JointDeclaration,
  JointDeclarationId,
  JointDeclarationSlug,
  JointDeclarationTitle,
  generateJointDeclarationSlug,
} from '../entities/joint-declaration'
import { declarationContent, StatementAuthor } from '../entities/statement'
import { StoredEvent, StreamRef } from '../events/event-store'
import type { Signature } from './statement'
import { Cascade, Decision, refused, Rejected } from './decision'
import { isoDate } from './iso-date'
import { blankToUndefined } from './optional-text'
import { authored, authorOf, Decoded, replayStream } from './replay'
import {
  decodeJointDeclarationEvent,
  JointDeclarationContent,
  JointDeclarationEvent,
} from './joint-declaration-events'

export const JOINT_DECLARATION_STREAM = 'joint_declaration'

export const jointDeclarationStream = (id: string): StreamRef => ({
  streamType: JOINT_DECLARATION_STREAM,
  streamId: id,
})

/**
 * A position the text takes, in its own words. A text may take several on
 * the same subject — two measures it calls for, say — but each one once.
 */
export interface TakenPosition {
  subjectId: string
  positionId: string
  /** The words of the text that state the position: every signatory's quote */
  quote: string
}

/**
 * What the journal says a joint declaration is right now. Signing is signing
 * the whole text: every signatory holds every position, so the two lists are
 * all there is to know — the statements are their product.
 */
export interface JointDeclarationState {
  declaration: JointDeclaration
  positions: readonly TakenPosition[]
  signatories: readonly StatementAuthor[]
}

export interface JointDeclarationInput {
  title: string
  presentation?: string
  sourceName: string
  sourceUrl: string
  declaredAt: Date
}

const sameAuthor = (a: StatementAuthor, b: StatementAuthor) => a.kind === b.kind && a.id === b.id

/** Whether this personality or organisation has signed the text */
export const hasSigned = (state: JointDeclarationState, author: StatementAuthor): boolean =>
  isAmong(state.signatories, author)

/** Whether a personality or an organisation is one of these signatories, kind and id alike */
export const isAmong = (signatories: readonly StatementAuthor[], author: StatementAuthor) =>
  signatories.some((signatory) => sameAuthor(signatory, author))

/**
 * The statement a signature makes on one position of the text: the position,
 * the words, the source and the day are the text's, the same for every
 * signatory. It mobilises no argument of its own until someone says which.
 */
export const signatureOf = (
  state: JointDeclarationState,
  author: StatementAuthor,
  taken: TakenPosition,
): Signature => ({
  author,
  subjectId: taken.subjectId,
  positionId: taken.positionId,
  content: declarationContent(taken.quote),
  sourceName: state.declaration.sourceName,
  sourceUrl: state.declaration.sourceUrl,
  statedAt: state.declaration.declaredAt,
  argumentIds: [],
  jointDeclarationId: state.declaration.id,
})

/* Facts: what the stream records, named in the past tense as the events they are */

export const jointDeclarationPublished = (input: JointDeclarationInput): JointDeclarationEvent => {
  const presentation = blankToUndefined(input.presentation)
  return {
    type: 'JointDeclarationPublished',
    payload: {
      title: input.title,
      slug: generateJointDeclarationSlug(input.title),
      ...(presentation ? { presentation } : {}),
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      declaredAt: isoDate(input.declaredAt),
    },
  }
}

export const positionTaken = (taken: TakenPosition): JointDeclarationEvent => ({
  type: 'PositionTaken',
  payload: { subjectId: taken.subjectId, positionId: taken.positionId, quote: taken.quote },
})

export const signatoryAdded = (author: StatementAuthor): JointDeclarationEvent => ({
  type: 'SignatoryAdded',
  payload: { author },
})

export const signatoryWithdrawn = (author: StatementAuthor): JointDeclarationEvent => ({
  type: 'SignatoryWithdrawn',
  payload: { author },
})

export const takenPositionMerged = (sourceId: string, targetId: string): JointDeclarationEvent => ({
  type: 'TakenPositionMerged',
  payload: { sourceId, targetId },
})

export const engagedSubjectMerged = (
  sourcePositionId: string,
  subjectId: string,
  positionId: string,
): JointDeclarationEvent => ({
  type: 'EngagedSubjectMerged',
  payload: { sourcePositionId, subjectId, positionId },
})

export const subjectDisengaged = (subjectId: string): JointDeclarationEvent => ({
  type: 'SubjectDisengaged',
  payload: { subjectId },
})

/* Decisions: what a command asks of the joint declaration, decided from its state */

export type JointDeclarationDecision = Decision<JointDeclarationState, JointDeclarationEvent>

/** What another aggregate's command does to the joint declarations it reaches */
export type JointDeclarationCascade = Cascade<JointDeclarationState, JointDeclarationEvent>

export const NO_POSITION_TAKEN = 'Une déclaration commune prend au moins une position.'
export const POSITION_ALREADY_TAKEN = 'Cette déclaration commune prend déjà cette position.'
export const ALREADY_SIGNATORY = 'Cette signature est déjà enregistrée.'

const engages = (positions: readonly TakenPosition[], subjectId: string) =>
  positions.some((taken) => taken.subjectId === subjectId)

const takes = (positions: readonly TakenPosition[], positionId: string) =>
  positions.some((taken) => taken.positionId === positionId)

const takesAPositionTwice = (positions: readonly TakenPosition[]) =>
  positions.some((taken, index) => takes(positions.slice(0, index), taken.positionId))

/** The positions, each once: the first to name a position keeps its words */
const eachOnce = (positions: readonly TakenPosition[]): TakenPosition[] =>
  positions.filter((taken, index) => !takes(positions.slice(0, index), taken.positionId))

/**
 * A contributor references the text and what it takes position on; its id is
 * the stream's, chosen by the command. A text that takes no position has
 * nothing for a signatory to hold, and a text takes a position once.
 */
export const publishJointDeclaration = (
  input: JointDeclarationInput,
  positions: readonly TakenPosition[],
): Either.Either<JointDeclarationEvent[], Rejected> => {
  if (positions.length === 0) return refused(NO_POSITION_TAKEN, 'positions')
  if (takesAPositionTwice(positions)) return refused(POSITION_ALREADY_TAKEN, 'positions')
  return Either.right([jointDeclarationPublished(input), ...positions.map(positionTaken)])
}

/** The text is found to take one more position, on a subject it engaged already or on another */
export const takePosition =
  (taken: TakenPosition): JointDeclarationDecision =>
  (state) =>
    takes(state.positions, taken.positionId)
      ? refused(POSITION_ALREADY_TAKEN, 'positionId')
      : Either.right([positionTaken(taken)])

/**
 * A personality or an organisation is found among the signatories of the
 * text. A text whose subjects all left the site takes no position any more:
 * a signature of it would make no statement, and is refused.
 */
export const addSignatory =
  (author: StatementAuthor): JointDeclarationDecision =>
  (state) => {
    if (state.positions.length === 0) return refused(NO_POSITION_TAKEN)
    return hasSigned(state, author)
      ? refused(ALREADY_SIGNATORY, 'author')
      : Either.right([signatoryAdded(author)])
  }

/**
 * The text follows a position it takes, merged into another of its subject.
 * Its signatories' statements follow on their own streams (`moveStatement`):
 * without this, the next signatory would be given a position that is gone.
 * A text that took both takes the one that remains, once, in the words it
 * had for the first of the two.
 */
export const followMergedPosition =
  (sourceId: string, targetId: string): JointDeclarationCascade =>
  (state) =>
    state.positions.some((taken) => taken.positionId === sourceId)
      ? [takenPositionMerged(sourceId, targetId)]
      : []

/**
 * The text follows a subject it engages, merged into another: `positionAfter`
 * tells, from each position the text takes on it, the one it takes there. Its
 * signatories' statements follow on their own streams (`followSubject`). Two
 * positions folded into the same one leave the text taking it once.
 */
export const followEngagedSubject =
  (
    sourceSubjectId: string,
    targetSubjectId: string,
    positionAfter: (positionId: string) => string,
  ): JointDeclarationCascade =>
  (state) =>
    state.positions
      .filter((taken) => taken.subjectId === sourceSubjectId)
      .map((taken) =>
        engagedSubjectMerged(taken.positionId, targetSubjectId, positionAfter(taken.positionId)),
      )

/** The text stops engaging a subject that leaves the site, with the statements made on it */
export const disengageFrom =
  (subjectId: string): JointDeclarationCascade =>
  (state) =>
    engages(state.positions, subjectId) ? [subjectDisengaged(subjectId)] : []

/**
 * A signature of the text is withdrawn by a moderator, found beyond repair.
 * Signing is signing the whole text, so the signatory leaves it whole: the
 * other statements the signature made go on their own streams
 * (`removeStatement`), and the next position the text takes is not theirs.
 */
export const withdrawSignatory =
  (author: StatementAuthor): JointDeclarationCascade =>
  (state) =>
    hasSigned(state, author) ? [signatoryWithdrawn(author)] : []

/**
 * Rebuilds the joint declaration from its stream; null for a stream without
 * events. A joint declaration always has an author (the column is not null).
 */
export const replayJointDeclaration = replayStream(
  decodeJointDeclarationEvent,
  apply,
  authored(['JointDeclarationPublished'], 'a joint declaration'),
)

function apply(
  state: JointDeclarationState | null,
  { event, stored }: Decoded<JointDeclarationEvent>,
): JointDeclarationState | null {
  switch (event.type) {
    case 'JointDeclarationPublished':
      return { declaration: declarationFrom(stored, event.payload), positions: [], signatories: [] }
    case 'PositionTaken':
      return state && { ...touched(state, stored), positions: [...state.positions, event.payload] }
    case 'SignatoryAdded':
      return (
        state && {
          ...touched(state, stored),
          signatories: [...state.signatories, event.payload.author],
        }
      )
    case 'SignatoryWithdrawn':
      return (
        state && {
          ...touched(state, stored),
          signatories: state.signatories.filter(
            (signatory) => !sameAuthor(signatory, event.payload.author),
          ),
        }
      )
    case 'TakenPositionMerged':
      return (
        state && {
          ...touched(state, stored),
          positions: eachOnce(
            state.positions.map((taken) =>
              taken.positionId === event.payload.sourceId
                ? { ...taken, positionId: event.payload.targetId }
                : taken,
            ),
          ),
        }
      )
    case 'EngagedSubjectMerged':
      return (
        state && {
          ...touched(state, stored),
          positions: eachOnce(
            state.positions.map((taken) =>
              taken.positionId === event.payload.sourcePositionId
                ? {
                    ...taken,
                    subjectId: event.payload.subjectId,
                    positionId: event.payload.positionId,
                  }
                : taken,
            ),
          ),
        }
      )
    case 'SubjectDisengaged':
      return (
        state && {
          ...touched(state, stored),
          positions: state.positions.filter((taken) => taken.subjectId !== event.payload.subjectId),
        }
      )
  }
}

/** The state, signed and dated by the event that changes it */
function touched(state: JointDeclarationState, stored: StoredEvent): JointDeclarationState {
  return {
    ...state,
    declaration: {
      ...state.declaration,
      updatedBy: stored.actorId ?? state.declaration.updatedBy,
      updatedAt: stored.occurredAt,
    },
  }
}

function declarationFrom(stored: StoredEvent, payload: JointDeclarationContent): JointDeclaration {
  return JointDeclaration.make({
    id: JointDeclarationId.make(stored.streamId),
    title: JointDeclarationTitle.make(payload.title),
    slug: JointDeclarationSlug.make(payload.slug),
    ...(payload.presentation ? { presentation: payload.presentation } : {}),
    sourceName: payload.sourceName,
    sourceUrl: payload.sourceUrl,
    declaredAt: new Date(payload.declaredAt),
    createdBy: authorOf(stored),
    updatedBy: authorOf(stored),
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
