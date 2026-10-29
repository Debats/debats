import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { generateThemeSlug, ThemeId } from '../entities/theme'
import { addTheme } from '../aggregates/theme'
import { runUnitOfWork } from '../events/unit-of-work'
import { ThemeRepository } from '../repositories/theme-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { openStream } from './aggregate-stream'
import { allowedTo, fieldsOf, free } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { themeAggregate } from './theme-stream'

const CreateThemeInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(50)),
  description: S.String.pipe(S.minLength(10)),
})

const FIELD_MESSAGES = {
  name: 'Le nom doit faire entre 2 et 50 caractères.',
  description: 'La description doit faire au moins 10 caractères.',
}

const NAME_TAKEN = 'Une thématique avec ce nom existe déjà.'

type CreateThemeParams = {
  contributor: ContributorIdentity | null
  name: string
  description: string
}

export type { FieldErrors }

/** Read side: the name must be free */
const themes = Effect.serviceFunctions(ThemeRepository)

export function createThemeUseCase(params: CreateThemeParams) {
  const { name, description } = params
  // The command names the theme: the stream exists from its first event
  const id = ThemeId.make(crypto.randomUUID())

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_theme', 'créer une thématique'),
      input: fieldsOf(CreateThemeInput, FIELD_MESSAGES)({ name, description }),
    }),
    Effect.tap(() => Effect.flatMap(themes.findBySlug(generateThemeSlug(name)), free(NAME_TAKEN))),
    Effect.flatMap(({ contributor, input }) =>
      runUnitOfWork((events) =>
        openStream(themeAggregate, events, id, addTheme(input), contributor.id),
      ),
    ),
    uniqueTakenAs('name', NAME_TAKEN),
    Effect.map(({ state }) => state.theme),
  )
}
