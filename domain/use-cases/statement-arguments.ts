import { Effect, Either } from 'effect'
import { Argument, createArgument, sameArgumentTitle } from '../entities/argument'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

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

/**
 * Creates the proposed arguments, links every argument to the statement and
 * records the contributor's reputation. Call once the statement is persisted.
 */
export async function attachStatementArguments(params: {
  contributor: ContributorIdentity
  statementId: string
  validated: ValidatedStatementArguments
  argumentRepo: ArgumentRepository
  reputationRepo: ReputationRepository
}): Promise<Argument[]> {
  const { contributor, statementId, validated, argumentRepo, reputationRepo } = params

  const created: Argument[] = []
  for (const proposed of validated.toCreate) {
    const argument = await Effect.runPromise(
      argumentRepo.create(createArgument({ ...proposed, createdBy: contributor.id })),
    )
    created.push(argument)
    await Effect.runPromise(
      reputationRepo.recordEvent({
        contributorId: contributor.id,
        action: 'added_argument_validated',
        amount: reputationReward('added_argument_validated'),
        relatedEntityType: 'argument',
        relatedEntityId: argument.id,
      }),
    )
  }

  const argumentIds = [...validated.existingIds, ...created.map((a) => a.id)]
  await Effect.runPromise(
    argumentRepo.setStatementArguments(statementId, argumentIds, contributor.id),
  )

  for (const argumentId of argumentIds) {
    await Effect.runPromise(
      reputationRepo.recordEvent({
        contributorId: contributor.id,
        action: 'linked_argument_to_statement',
        amount: reputationReward('linked_argument_to_statement'),
        relatedEntityType: 'argument',
        relatedEntityId: argumentId,
      }),
    )
  }

  return created
}
