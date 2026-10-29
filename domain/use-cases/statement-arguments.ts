import { Effect, pipe } from 'effect'
import { ArgumentId, sameArgumentTitle } from '../entities/argument'
import { addArgument, argumentStream } from '../aggregates/argument'
import { ConcurrencyError, EventStore, UniqueTaken } from '../events/event-store'
import { ArgumentRepository } from '../repositories/argument-repository'
import { DatabaseError } from '../repositories/errors'
import { ContributorIdentity, Rejected } from './types'
import { mayPerform } from './preconditions'
import { Grant, rewardFor } from './reward'

/** A new argument proposed from the statement form */
export interface NewArgumentInput {
  title: string
  description: string
}

export interface StatementArgumentsInput {
  /** Existing arguments the statement mobilises */
  argumentIds: string[]
  newArguments: NewArgumentInput[]
}

/** What was checked and can be attached once the statement exists */
export interface ValidatedStatementArguments {
  existingIds: string[]
  toCreate: NewArgumentInput[]
}

const NONE: ValidatedStatementArguments = { existingIds: [], toCreate: [] }

/** A proposed title was taken between the check and the transaction: the list now has it */
export const ARGUMENT_JUST_CREATED =
  'Un argument de ce titre vient d’être créé : choisissez-le dans la liste.'

const TITLE_MIN = 3
const TITLE_MAX = 255

const wellFormed = (proposed: NewArgumentInput) =>
  proposed.title.length >= TITLE_MIN && proposed.title.length <= TITLE_MAX

/** Read side: the chosen arguments must exist, a proposed title may already be one */
const argumentsRead = Effect.serviceFunctions(ArgumentRepository)

/**
 * Checks that the contributor may mobilise arguments, that the chosen ones
 * exist, and that the proposed ones are well-formed. A proposed title that
 * already exists anywhere on the site is reused rather than duplicated.
 */
export function validateStatementArguments(
  contributor: ContributorIdentity,
  input: StatementArgumentsInput,
): Effect.Effect<ValidatedStatementArguments, Rejected | DatabaseError, ArgumentRepository> {
  const argumentIds = Array.from(new Set(input.argumentIds.filter(Boolean)))
  const newArguments = input.newArguments.map((a) => ({
    title: a.title.trim(),
    description: a.description.trim(),
  }))

  if (argumentIds.length === 0 && newArguments.length === 0) {
    return Effect.succeed(NONE)
  }

  return pipe(
    mayPerform('add_argument', 'mobiliser des arguments')(contributor),
    Effect.filterOrFail(
      () => newArguments.every(wellFormed),
      () =>
        new Rejected(
          `Le titre d’un argument fait de ${TITLE_MIN} à ${TITLE_MAX} caractères.`,
          'arguments',
        ),
    ),
    Effect.andThen(() => argumentsRead.findByIds(argumentIds)),
    Effect.filterOrFail(
      (known) => known.length === argumentIds.length,
      () => new Rejected('Un des arguments choisis n’existe plus.'),
    ),
    Effect.andThen(
      Effect.forEach(newArguments, (proposed) =>
        Effect.map(argumentsRead.findByTitle(proposed.title), (existing) => ({
          proposed,
          existing,
        })),
      ),
    ),
    Effect.map((proposals) => sortedOut(argumentIds, proposals)),
  )
}

/** A proposal whose title the site knows is that argument; the others are proposed once each */
function sortedOut(
  argumentIds: string[],
  proposals: readonly { proposed: NewArgumentInput; existing: { id: string } | null }[],
): ValidatedStatementArguments {
  const existingIds = new Set(argumentIds)
  const toCreate: NewArgumentInput[] = []
  for (const { proposed, existing } of proposals) {
    if (existing) {
      existingIds.add(existing.id)
    } else if (!toCreate.some((a) => sameArgumentTitle(a.title, proposed.title))) {
      toCreate.push(proposed)
    }
  }
  return { existingIds: Array.from(existingIds), toCreate }
}

/** Every argument the statement will mobilise, and among them those just proposed */
export interface RecordedArguments {
  argumentIds: string[]
  createdIds: string[]
}

/**
 * Opens a stream for each proposed argument, in the transaction of the
 * statement that mobilises it: the command names the argument, as the stream.
 * The statement's own events carry the links.
 */
export function recordProposedArguments(
  events: EventStore,
  actorId: string,
  validated: ValidatedStatementArguments,
): Effect.Effect<RecordedArguments, DatabaseError | ConcurrencyError | UniqueTaken> {
  return Effect.map(
    Effect.forEach(validated.toCreate, (proposed) => {
      const id = ArgumentId.make(crypto.randomUUID())
      return Effect.as(events.append(argumentStream(id), 0, addArgument(proposed), { actorId }), id)
    }),
    (createdIds) => ({ argumentIds: [...validated.existingIds, ...createdIds], createdIds }),
  )
}

/** What the contributor earns: each argument proposed, then each one the statement mobilises */
export function argumentRewards(contributorId: string, recorded: RecordedArguments): Grant[] {
  const on = (relatedEntityId: string) => ({
    relatedEntityType: 'argument' as const,
    relatedEntityId,
  })
  return [
    ...recorded.createdIds.map((id) =>
      rewardFor(contributorId, 'added_argument_validated', on(id)),
    ),
    ...recorded.argumentIds.map((id) =>
      rewardFor(contributorId, 'linked_argument_to_statement', on(id)),
    ),
  ]
}
