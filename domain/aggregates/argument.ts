import {
  Argument,
  ArgumentId,
  ArgumentSlug,
  ArgumentTitle,
  generateArgumentSlug,
} from '../entities/argument'
import { StoredEvent, StreamRef } from '../events/event-store'
import { ArgumentEvent, ArgumentWording, decodeArgumentEvent } from './argument-events'
import { authored, Decoded, replayStream } from './replay'

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

/** Decision: a contributor proposes an argument (its id is chosen by the caller, as the stream's) */
export const addArgument = (input: ArgumentInput): ArgumentEvent => ({
  type: 'ArgumentAdded',
  payload: wording(input),
})

/** Decision: the wording changes; the links to statements are untouched */
export const renameArgument = (input: ArgumentInput): ArgumentEvent => ({
  type: 'ArgumentRenamed',
  payload: wording(input),
})

/** Decision: this argument is a duplicate of the target and disappears into it */
export const mergeArgumentInto = (targetArgumentId: string): ArgumentEvent => ({
  type: 'ArgumentMergedInto',
  payload: { targetArgumentId },
})

/** An argument found in the tables before its journal existed enters it as it is */
export const importArgument = (argument: Argument): ArgumentEvent => ({
  type: 'ArgumentImported',
  payload: wording(argument),
})

/** Whether the argument can still be mobilised, renamed or merged */
export const isLiveArgument = (state: ArgumentState): boolean => state.deletedAt === null

/**
 * Rebuilds the argument from its stream; null for a stream without events.
 * An argument always has an author (the column is not null).
 */
export const replayArgument = replayStream(
  decodeArgumentEvent,
  apply,
  authored(['ArgumentAdded', 'ArgumentImported'], 'an argument'),
)

function apply(
  state: ArgumentState | null,
  { event, stored }: Decoded<ArgumentEvent>,
): ArgumentState | null {
  switch (event.type) {
    case 'ArgumentAdded':
    case 'ArgumentImported':
      return { argument: argumentFrom(stored, event.payload), mergedInto: null, deletedAt: null }
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
    // Checked by requireAuthorOfCreation before any event is applied
    createdBy: stored.actorId!,
    updatedBy: stored.actorId!,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
