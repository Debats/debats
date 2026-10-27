import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { ConcurrencyError, UniqueTaken } from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { NotFound, Rejected } from './types'
import {
  EDITED_MEANWHILE,
  runCommand,
  runFormCommand,
  uniqueTakenAs,
  VALUE_TAKEN,
} from './run-command'

const stream = { streamType: 'counter', streamId: 'c-1' }

describe('runCommand', () => {
  it('hands the outcome of a command that went through', async () => {
    expect(await runCommand(Effect.succeed(42))).toEqual(Either.right(42))
  })

  it('tells a refusal, and an aggregate not found, in their own words', async () => {
    expect(await runCommand(Effect.fail(new Rejected('Trop haut.')))).toEqual(
      Either.left('Trop haut.'),
    )
    expect(await runCommand(Effect.fail(new NotFound('Sujet introuvable.')))).toEqual(
      Either.left('Sujet introuvable.'),
    )
  })

  it('tells a race and a value taken meanwhile in the words of the site', async () => {
    expect(await runCommand(Effect.fail(new ConcurrencyError(stream, 3)))).toEqual(
      Either.left(EDITED_MEANWHILE),
    )
    expect(await runCommand(Effect.fail(new UniqueTaken('themes_slug_key')))).toEqual(
      Either.left(VALUE_TAKEN),
    )
  })

  it('throws a failure of the system, which is not for the contributor', async () => {
    await expect(runCommand(Effect.fail(new DatabaseError('down')))).rejects.toBeInstanceOf(
      DatabaseError,
    )
  })
})

describe('runFormCommand', () => {
  it('blames the field a refusal names, and keeps a message for the rest', async () => {
    expect(await runFormCommand(Effect.fail(new Rejected('Déjà pris.', 'title')))).toEqual(
      Either.left({ title: 'Déjà pris.' }),
    )
    expect(await runFormCommand(Effect.fail(new NotFound('Sujet introuvable.')))).toEqual(
      Either.left('Sujet introuvable.'),
    )
  })

  it('names the field of a value a projection refused', async () => {
    const command = uniqueTakenAs(
      'title',
      'Un sujet porte déjà ce titre.',
    )(Effect.fail(new UniqueTaken('subjects_slug_key')))

    expect(await runFormCommand(command)).toEqual(
      Either.left({ title: 'Un sujet porte déjà ce titre.' }),
    )
  })
})
