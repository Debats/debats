import * as S from 'effect/Schema'
import { eventDecoder } from '../events/decode-event'

/**
 * The subject is the root of one stream that also carries its positions,
 * its themes and its links to other subjects: everything a decision on a
 * subject needs. Statements have their own streams.
 */

const SubjectContent = S.Struct({
  title: S.String,
  slug: S.String,
  presentation: S.String,
  problem: S.String,
  pictureUrl: S.optional(S.String),
})
export type SubjectContent = S.Schema.Type<typeof SubjectContent>

export const SubjectAdded = S.Struct({ type: S.Literal('SubjectAdded'), payload: SubjectContent })

/** The subject existed before the journal; this is the state it was found in */
export const SubjectImported = S.Struct({
  type: S.Literal('SubjectImported'),
  payload: SubjectContent,
})

export const SubjectEdited = S.Struct({
  type: S.Literal('SubjectEdited'),
  payload: S.Struct({
    title: S.String,
    slug: S.String,
    presentation: S.String,
    problem: S.String,
  }),
})

const ThemeAssignment = S.Struct({ themeId: S.String, isPrimary: S.Boolean })
export type ThemeAssignmentPayload = S.Schema.Type<typeof ThemeAssignment>

/** The whole set of themes, replaced at once; at most one is primary */
export const SubjectThemesSet = S.Struct({
  type: S.Literal('SubjectThemesSet'),
  payload: S.Struct({ themes: S.Array(ThemeAssignment) }),
})

/** Links are symmetric: both subjects record the same link in their own stream */
export const SubjectLinked = S.Struct({
  type: S.Literal('SubjectLinked'),
  payload: S.Struct({ subjectId: S.String }),
})

export const SubjectUnlinked = S.Struct({
  type: S.Literal('SubjectUnlinked'),
  payload: S.Struct({ subjectId: S.String }),
})

const PositionContent = S.Struct({
  positionId: S.String,
  title: S.String,
  slug: S.String,
  description: S.String,
})
export type PositionContent = S.Schema.Type<typeof PositionContent>

export const PositionAdded = S.Struct({
  type: S.Literal('PositionAdded'),
  payload: PositionContent,
})

export const PositionImported = S.Struct({
  type: S.Literal('PositionImported'),
  payload: PositionContent,
})

export const PositionEdited = S.Struct({
  type: S.Literal('PositionEdited'),
  payload: PositionContent,
})

/** The source disappears; its statements record their own move */
export const PositionMergedInto = S.Struct({
  type: S.Literal('PositionMergedInto'),
  payload: S.Struct({ sourceId: S.String, targetId: S.String }),
})

/** A position removed before the journal, without a known target */
export const PositionRemoved = S.Struct({
  type: S.Literal('PositionRemoved'),
  payload: S.Struct({ positionId: S.String }),
})

export const SubjectDeleted = S.Struct({ type: S.Literal('SubjectDeleted'), payload: S.Struct({}) })

export const SubjectEvent = S.Union(
  SubjectAdded,
  SubjectImported,
  SubjectEdited,
  SubjectThemesSet,
  SubjectLinked,
  SubjectUnlinked,
  PositionAdded,
  PositionImported,
  PositionEdited,
  PositionMergedInto,
  PositionRemoved,
  SubjectDeleted,
)
export type SubjectEvent = S.Schema.Type<typeof SubjectEvent>

/** Reads a stored event as a subject event, or says why the journal is corrupt */
export const decodeSubjectEvent = eventDecoder(SubjectEvent)
