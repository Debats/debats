import { Effect, Either } from 'effect'
import { ArgumentId, sameArgumentTitle } from '../entities/argument'
import { addArgument, argumentStream } from '../aggregates/argument'
import { ConcurrencyError, EventStore } from '../events/event-store'
import { ArgumentRepository } from '../repositories/argument-repository'
import { DatabaseError } from '../repositories/errors'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'
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

const TITLE_MIN = 3
const TITLE_MAX = 255

/**
 * Checks that the contributor may mobilise arguments, that the chosen ones
 * exist, and that the proposed ones are well-formed. A proposed title that
 * already exists anywhere on the site is reused rather than duplicated.
 */
export async function validateStatementArguments(params: {
  contributor: ContributorIdentity
  input: StatementArgumentsInput
  argumentRepo: ArgumentRepository
}): Promise<Either.Either<ValidatedStatementArguments, string | FieldErrors>> {
  const { contributor, input, argumentRepo } = params
  const argumentIds = Array.from(new Set(input.argumentIds.filter(Boolean)))
  const newArguments = input.newArguments.map((a) => ({
    title: a.title.trim(),
    description: a.description.trim(),
  }))

  if (argumentIds.length === 0 && newArguments.length === 0) {
    return Either.right(NONE)
  }

  if (!canPerform(contributor.reputation, 'add_argument')) {
    const rank = requiredRank('add_argument')
    return Either.left(`Vous devez être ${rank} pour mobiliser des arguments.`)
  }

  const malformed = newArguments.find(
    (a) => a.title.length < TITLE_MIN || a.title.length > TITLE_MAX,
  )
  if (malformed) {
    return Either.left({
      arguments: `Le titre d’un argument fait de ${TITLE_MIN} à ${TITLE_MAX} caractères.`,
    })
  }

  const known = await Effect.runPromise(argumentRepo.findByIds(argumentIds))
  if (known.length !== argumentIds.length) {
    return Either.left('Un des arguments choisis n’existe plus.')
  }

  const existingIds = new Set(argumentIds)
  const toCreate: NewArgumentInput[] = []
  for (const proposed of newArguments) {
    const existing = await Effect.runPromise(argumentRepo.findByTitle(proposed.title))
    if (existing) {
      existingIds.add(existing.id)
    } else if (!toCreate.some((a) => sameArgumentTitle(a.title, proposed.title))) {
      toCreate.push(proposed)
    }
  }

  return Either.right({ existingIds: Array.from(existingIds), toCreate })
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
): Effect.Effect<RecordedArguments, DatabaseError | ConcurrencyError> {
  return Effect.map(
    Effect.forEach(validated.toCreate, (proposed) => {
      const id = ArgumentId.make(crypto.randomUUID())
      return Effect.as(
        events.append(argumentStream(id), 0, [addArgument(proposed)], { actorId }),
        id,
      )
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
