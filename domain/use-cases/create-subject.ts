import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { generateSlug, Subject, SubjectId, SubjectTitle } from '../entities/subject'
import { addSubject } from '../aggregates/subject'
import { RunUnitOfWork } from '../events/unit-of-work'
import { SubjectRepository } from '../repositories/subject-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { openStream } from './aggregate-stream'
import { allowedTo, fieldsOf, free } from './preconditions'
import { runFormCommand, uniqueTakenAs } from './run-command'
import { subjectAggregate } from './subject-stream'

const CreateSubjectInput = S.Struct({
  title: SubjectTitle,
  presentation: S.String.pipe(S.minLength(10)),
  problem: S.String.pipe(S.minLength(10)),
})

const FIELD_MESSAGES = {
  title: 'Le titre doit faire entre 3 et 100 caractères.',
  presentation: 'La présentation doit faire au moins 10 caractères.',
  problem: 'La problématique doit faire au moins 10 caractères.',
}

const TITLE_TAKEN = 'Un sujet porte déjà ce titre.'

type CreateSubjectParams = {
  contributor: ContributorIdentity | null
  title: string
  presentation: string
  problem: string
  runUnitOfWork: RunUnitOfWork
  /** Read side: the title must be free */
  subjectRepo: SubjectRepository
}

export type { FieldErrors }

export function createSubjectUseCase(
  params: CreateSubjectParams,
): Promise<Either.Either<Subject, string | FieldErrors>> {
  return runFormCommand(createSubjectCommand(params))
}

/** The command itself, for a process that runs it among others */
export function createSubjectCommand(params: CreateSubjectParams) {
  const { title, presentation, problem, runUnitOfWork, subjectRepo } = params
  // The command names the subject: the stream exists from its first event
  const id = SubjectId.make(crypto.randomUUID())

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_subject', 'créer un sujet'),
      input: fieldsOf(CreateSubjectInput, FIELD_MESSAGES)({ title, presentation, problem }),
    }),
    Effect.tap(({ input }) =>
      Effect.flatMap(subjectRepo.findBySlug(generateSlug(input.title)), free(TITLE_TAKEN, 'title')),
    ),
    Effect.flatMap(({ contributor, input }) =>
      runUnitOfWork((events) =>
        pipe(
          openStream(subjectAggregate, events, id, [addSubject(input)], contributor.id),
          Effect.tap(() =>
            grant(
              events,
              contributor.id,
              rewardFor(contributor.id, 'added_subject', {
                relatedEntityType: 'subject',
                relatedEntityId: id,
              }),
            ),
          ),
        ),
      ),
    ),
    uniqueTakenAs('title', TITLE_TAKEN),
    Effect.map(({ state }) => state.subject),
  )
}
