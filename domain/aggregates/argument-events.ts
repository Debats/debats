import * as S from 'effect/Schema'
import { eventDecoder } from '../events/decode-event'

/**
 * An argument is a stream of its own: a global tag whose wording changes and
 * which can be folded into another one. Which statements mobilise it is in
 * their streams, never in this one.
 */

const ArgumentWording = S.Struct({
  title: S.String,
  slug: S.String,
  description: S.String,
})
export type ArgumentWording = S.Schema.Type<typeof ArgumentWording>

export const ArgumentAdded = S.Struct({
  type: S.Literal('ArgumentAdded'),
  payload: ArgumentWording,
})

/** The argument existed before the journal; this is the state it was found in */
export const ArgumentImported = S.Struct({
  type: S.Literal('ArgumentImported'),
  payload: ArgumentWording,
})

export const ArgumentRenamed = S.Struct({
  type: S.Literal('ArgumentRenamed'),
  payload: ArgumentWording,
})

/** A duplicate folded into the argument that remains; its statements now mobilise that one */
export const ArgumentMergedInto = S.Struct({
  type: S.Literal('ArgumentMergedInto'),
  payload: S.Struct({ targetArgumentId: S.String }),
})

/**
 * The argument that remains took a duplicate in. Written at the target's
 * revision in the merge's transaction: two merges crossing each other
 * (A into B, B into A) cannot both commit.
 */
export const ArgumentAbsorbed = S.Struct({
  type: S.Literal('ArgumentAbsorbed'),
  payload: S.Struct({ sourceArgumentId: S.String }),
})

export const ArgumentDeleted = S.Struct({
  type: S.Literal('ArgumentDeleted'),
  payload: S.Struct({}),
})

export const ArgumentEvent = S.Union(
  ArgumentAdded,
  ArgumentImported,
  ArgumentRenamed,
  ArgumentMergedInto,
  ArgumentAbsorbed,
  ArgumentDeleted,
)
export type ArgumentEvent = S.Schema.Type<typeof ArgumentEvent>

/** Reads a stored event as an argument event, or says why the journal is corrupt */
export const decodeArgumentEvent = eventDecoder(ArgumentEvent)
