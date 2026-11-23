import * as S from 'effect/Schema'
import { StatementAuthor } from '../entities/statement'
import { eventDecoder } from '../events/decode-event'

/**
 * A joint declaration is a stream of its own: the text, the positions it
 * takes and who signed it. The statements a signature makes are in their own
 * streams (`StatementAdded`, which names the joint declaration it comes from).
 */

/** A calendar day, as the form and the declared_at column carry it */
const IsoDate = S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/))

const JointDeclarationContent = S.Struct({
  title: S.String,
  slug: S.String,
  presentation: S.optional(S.String),
  sourceName: S.String,
  sourceUrl: S.String,
  declaredAt: IsoDate,
})
export type JointDeclarationContent = S.Schema.Type<typeof JointDeclarationContent>

/** A contributor referenced the text */
export const JointDeclarationPublished = S.Struct({
  type: S.Literal('JointDeclarationPublished'),
  payload: JointDeclarationContent,
})

/** A position the text takes, in its own words; several may be on the same subject */
const TakenPositionPayload = S.Struct({
  subjectId: S.String,
  positionId: S.String,
  /** The words of the text that state the position: every signatory's quote */
  quote: S.String,
})
export type TakenPositionPayload = S.Schema.Type<typeof TakenPositionPayload>

/** The text takes a position it did not take yet */
export const PositionTaken = S.Struct({
  type: S.Literal('PositionTaken'),
  payload: TakenPositionPayload,
})

/** A personality or an organisation signed the text, the whole of it */
export const SignatoryAdded = S.Struct({
  type: S.Literal('SignatoryAdded'),
  payload: S.Struct({ author: StatementAuthor }),
})

/** A signature was found wrong and withdrawn: the signatory holds none of the text's positions any more */
export const SignatoryWithdrawn = S.Struct({
  type: S.Literal('SignatoryWithdrawn'),
  payload: S.Struct({ author: StatementAuthor }),
})

/** A position the text takes was merged into another of the same subject: the text takes that one */
export const TakenPositionMerged = S.Struct({
  type: S.Literal('TakenPositionMerged'),
  payload: S.Struct({ sourceId: S.String, targetId: S.String }),
})

/**
 * A subject the text engaged was merged into another: a position the text
 * took on it is now the one it became there (carried over, or folded). One
 * event per position the text took on the subject that is gone.
 */
export const EngagedSubjectMerged = S.Struct({
  type: S.Literal('EngagedSubjectMerged'),
  payload: S.Struct({ sourcePositionId: S.String, subjectId: S.String, positionId: S.String }),
})

/** A subject the text engaged left the site: the text no longer takes position on it */
export const SubjectDisengaged = S.Struct({
  type: S.Literal('SubjectDisengaged'),
  payload: S.Struct({ subjectId: S.String }),
})

export const JointDeclarationEvent = S.Union(
  JointDeclarationPublished,
  PositionTaken,
  SignatoryAdded,
  SignatoryWithdrawn,
  TakenPositionMerged,
  EngagedSubjectMerged,
  SubjectDisengaged,
)
export type JointDeclarationEvent = S.Schema.Type<typeof JointDeclarationEvent>

/** Reads a stored event as a joint declaration event, or says why the journal is corrupt */
export const decodeJointDeclarationEvent = eventDecoder(JointDeclarationEvent)
