import {
  Argument,
  ArgumentId,
  ArgumentSlug,
  ArgumentTitle,
  generateArgumentSlug,
} from '../entities/argument'
import { StoredEvent, StreamRef } from '../events/event-store'
import { ArgumentEvent, ArgumentWording, decodeArgumentEvent } from './argument-events'
import { always, Decision } from './decision'
import { authored, authorOf, Decoded, replayStream } from './replay'

export const ARGUMENT_STREAM = 'argument'

export const argumentStream = (id: string): StreamRef => ({
  streamType: ARGUMENT_STREAM,
  streamId: id,
})

/** What the journal says an argument is right now */
export interface ArgumentState {
  argument: Argument
  /** The argument this one was folded into, when it was */
  mergedInto: string | null
  /** The duplicates folded into this one */
  absorbedIds: readonly string[]
  deletedAt: Date | null
}

export interface ArgumentInput {
  title: string
  description: string
}

const wording = (input: ArgumentInput): ArgumentWording => {
  const title = input.title.trim()
  return { title, slug: generateArgumentSlug(title), description: input.description.trim() }
}

/* Facts: what the stream records, named in the past tense as the events they are */

export const argumentAdded = (input: ArgumentInput): ArgumentEvent => ({
  type: 'ArgumentAdded',
  payload: wording(input),
})

export const argumentRenamed = (input: ArgumentInput): ArgumentEvent => ({
  type: 'ArgumentRenamed',
  payload: wording(input),
})

export const argumentMergedInto = (targetArgumentId: string): ArgumentEvent => ({
  type: 'ArgumentMergedInto',
  payload: { targetArgumentId },
})

export const argumentAbsorbed = (sourceArgumentId: string): ArgumentEvent => ({
  type: 'ArgumentAbsorbed',
  payload: { sourceArgumentId },
})

/* Decisions: what a command asks of the argument, decided from its state */

export type ArgumentDecision = Decision<ArgumentState, ArgumentEvent>

/** A contributor proposes an argument; its id is the stream's, chosen by the command */
export const addArgument = (input: ArgumentInput): ArgumentEvent[] => [argumentAdded(input)]

/** The wording changes; the links to statements are untouched */
export const renameArgument = (input: ArgumentInput): ArgumentDecision =>
  always(argumentRenamed(input))

/** This argument is a duplicate of the target and disappears into it */
export const mergeArgumentInto = (targetArgumentId: string): ArgumentDecision =>
  always(argumentMergedInto(targetArgumentId))

/** This argument takes a duplicate in, and stays */
export const absorbArgument = (sourceArgumentId: string): ArgumentDecision =>
  always(argumentAbsorbed(sourceArgumentId))

/** Whether the argument can still be mobilised, renamed or merged */
export const isLiveArgument = (state: ArgumentState): boolean => state.deletedAt === null

/**
 * Rebuilds the argument from its stream; null for a stream without events.
 * An argument always has an author (the column is not null).
 */
export const replayArgument = replayStream(
  decodeArgumentEvent,
  apply,
  authored(['ArgumentAdded'], 'an argument'),
)

function apply(
  state: ArgumentState | null,
  { event, stored }: Decoded<ArgumentEvent>,
): ArgumentState | null {
  switch (event.type) {
    case 'ArgumentAdded':
      return {
        argument: argumentFrom(stored, event.payload),
        mergedInto: null,
        absorbedIds: [],
        deletedAt: null,
      }
  }
  if (!state) return null
  switch (event.type) {
    case 'ArgumentRenamed':
      return {
        ...state,
        argument: {
          ...state.argument,
          ...argumentFields(event.payload),
          updatedBy: stored.actorId ?? state.argument.updatedBy,
          updatedAt: stored.occurredAt,
        },
      }
    case 'ArgumentMergedInto':
      return { ...state, mergedInto: event.payload.targetArgumentId, deletedAt: stored.occurredAt }
    case 'ArgumentAbsorbed':
      return { ...state, absorbedIds: [...state.absorbedIds, event.payload.sourceArgumentId] }
    case 'ArgumentDeleted':
      return { ...state, deletedAt: stored.occurredAt }
  }
}

function argumentFields(payload: ArgumentWording) {
  return {
    title: ArgumentTitle.make(payload.title),
    slug: ArgumentSlug.make(payload.slug),
    description: payload.description,
  }
}

function argumentFrom(stored: StoredEvent, payload: ArgumentWording): Argument {
  return Argument.make({
    id: ArgumentId.make(stored.streamId),
    ...argumentFields(payload),
    createdBy: authorOf(stored),
    updatedBy: authorOf(stored),
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
