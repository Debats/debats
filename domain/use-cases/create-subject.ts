import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { generateSlug, SubjectId, SubjectTitle } from '../entities/subject'
import { addSubject } from '../aggregates/subject'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { SubjectRepository } from '../repositories/subject-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, Grant, rewardFor } from './reward'
import { openStream } from './aggregate-stream'
import { allowedTo, faultsUnder, fieldsOf, free } from './preconditions'
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

/**
 * A title whose slug already names a subject. The command reads the titles
 * before writing, but the projector's unique index is what settles it, and
 * both commands that open a subject tell it on the field that caused it.
 */
export const SUBJECT_TITLE_TAKEN = 'Un sujet porte déjà ce titre.'

type CreateSubjectParams = NewSubject & {
  contributor: ContributorIdentity | null
}

export type { FieldErrors }

/** Read side: the title must be free */
const subjects = Effect.serviceFunctions(SubjectRepository)

/** No subject of that title yet; the slug is what would collide */
const titleFree = (input: { title: string }) =>
  Effect.flatMap(subjects.findBySlug(generateSlug(input.title)), free(SUBJECT_TITLE_TAKEN, 'title'))

/**
 * The fields of a subject opened from the all-in-one contribution form, with
 * the rank it takes and the title's freedom, reported under the names that
 * form gives its inputs — a statement carries a title of its own soon enough,
 * and so does the position opened beside this subject.
 */
export const inlineSubjectChecked = (params: NewSubject, contributor: ContributorIdentity | null) =>
  faultsUnder('subject')(
    pipe(
      allowedTo(contributor, 'add_subject', 'créer un sujet'),
      Effect.andThen(fieldsOf(CreateSubjectInput, FIELD_MESSAGES)(params)),
      Effect.tap(titleFree),
    ),
  )

/**
 * Opens the subject's stream inside the transaction it is given. The command
 * that creates a subject alone and the one that creates it with its first
 * statement both come through here, so one place knows how a subject comes
 * into being.
 *
 * The reward is left to the caller, who may have others to grant in the same
 * breath: a contributor's gains go to her stream in a single append.
 */
export const recordNewSubject = (
  events: EventStore,
  contributorId: string,
  input: { title: string; presentation: string; problem: string },
) => {
  // The command names the subject: the stream exists from its first event
  const id = SubjectId.make(crypto.randomUUID())
  return pipe(
    openStream(subjectAggregate, events, id, addSubject(input), contributorId),
    Effect.map(({ state }) => state.subject),
  )
}

/** What creating a subject earns, for the caller to grant alongside its others */
export const subjectReward = (contributorId: string, subjectId: string): Grant =>
  rewardFor(contributorId, 'added_subject', {
    relatedEntityType: 'subject',
    relatedEntityId: subjectId,
  })

export function createSubjectUseCase(params: CreateSubjectParams) {
  const { title, presentation, problem } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_subject', 'créer un sujet'),
      input: fieldsOf(CreateSubjectInput, FIELD_MESSAGES)({ title, presentation, problem }),
    }),
    Effect.tap(({ input }) => titleFree(input)),
    Effect.flatMap(({ contributor, input }) =>
      runUnitOfWork((events) =>
        pipe(
          recordNewSubject(events, contributor.id, input),
          Effect.tap((subject) =>
            grant(events, contributor.id, subjectReward(contributor.id, subject.id)),
          ),
        ),
      ),
    ),
    uniqueTakenAs('title', SUBJECT_TITLE_TAKEN),
  )
}
