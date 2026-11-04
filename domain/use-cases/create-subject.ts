import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { generateSlug, SubjectId, SubjectTitle } from '../entities/subject'
import { addSubject } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { SubjectRepository } from '../repositories/subject-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { openStream } from './aggregate-stream'
import { allowedTo, fieldsOf, free } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { subjectAggregate } from './subject-stream'

// The spaces around a title mean nothing: they are dropped before it is judged
const CreateSubjectInput = S.Struct({
  title: S.Trim.pipe(S.compose(SubjectTitle)),
  presentation: S.Trim.pipe(S.minLength(10)),
  problem: S.Trim.pipe(S.minLength(10)),
})

/**
 * What the form of a new subject sends: the fields as they were typed, which
 * the schema above judges and hands to the command. The action takes this type,
 * so a field the command needs cannot be left out of what the client sends.
 */
export type NewSubject = S.Schema.Encoded<typeof CreateSubjectInput>

const FIELD_MESSAGES = {
  title: 'Le titre doit faire entre 3 et 100 caractères.',
  presentation: 'La présentation doit faire au moins 10 caractères.',
  problem: 'La problématique doit faire au moins 10 caractères.',
}

const TITLE_TAKEN = 'Un sujet porte déjà ce titre.'

type CreateSubjectParams = NewSubject & {
  contributor: ContributorIdentity | null
}

export type { FieldErrors }

/** Read side: the title must be free */
const subjects = Effect.serviceFunctions(SubjectRepository)

export function createSubjectUseCase(params: CreateSubjectParams) {
  const { title, presentation, problem } = params
  // The command names the subject: the stream exists from its first event
  const id = SubjectId.make(crypto.randomUUID())

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_subject', 'créer un sujet'),
      input: fieldsOf(CreateSubjectInput, FIELD_MESSAGES)({ title, presentation, problem }),
    }),
    Effect.tap(({ input }) =>
      Effect.flatMap(subjects.findBySlug(generateSlug(input.title)), free(TITLE_TAKEN, 'title')),
    ),
    Effect.flatMap(({ contributor, input }) =>
      runUnitOfWork((events) =>
        pipe(
          openStream(subjectAggregate, events, id, addSubject(input), contributor.id),
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
