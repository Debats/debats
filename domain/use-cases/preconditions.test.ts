import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import * as S from 'effect/Schema'
import { Invalid, Rejected } from './types'
import {
  allowedTo,
  decoded,
  fieldsOf,
  found,
  free,
  INVALID_FORM,
  mayPerform,
  SIGN_IN,
  signedIn,
} from './preconditions'

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.either(effect))

const eloquent = { id: 'abc', reputation: 10_000 }
const newcomer = { id: 'abc', reputation: 0 }

describe('signedIn', () => {
  it('hands the contributor, or refuses nobody', async () => {
    expect(await run(signedIn(eloquent))).toEqual(Either.right(eloquent))
    expect(await run(signedIn(null))).toEqual(Either.left(new Rejected(SIGN_IN)))
  })
})

describe('mayPerform and allowedTo', () => {
  it('names the rank the action takes, and what for', async () => {
    expect(await run(mayPerform('edit_subject', 'modifier un sujet')(newcomer))).toEqual(
      Either.left(new Rejected('Vous devez être Idéaliste pour modifier un sujet.')),
    )
    expect(await run(allowedTo(eloquent, 'edit_subject', 'modifier un sujet'))).toEqual(
      Either.right(eloquent),
    )
  })

  it('asks to sign in before speaking of rank', async () => {
    expect(await run(allowedTo(null, 'edit_subject', 'modifier un sujet'))).toEqual(
      Either.left(new Rejected(SIGN_IN)),
    )
  })
})

describe('decoded', () => {
  const Input = S.Struct({ title: S.String.pipe(S.minLength(3)) })

  it('hands the decoded input, or refuses the whole form', async () => {
    expect(await run(decoded(Input)({ title: 'Le SMIC' }))).toEqual(
      Either.right({ title: 'Le SMIC' }),
    )
    expect(await run(decoded(Input)({ title: 'Ab' }))).toEqual(
      Either.left(new Rejected(INVALID_FORM)),
    )
  })
})

describe('fieldsOf', () => {
  const Input = S.Struct({ title: S.String.pipe(S.minLength(3)), body: S.String })
  const messages = { title: 'Le titre est trop court.' }

  it('hands the decoded input', async () => {
    expect(await run(fieldsOf(Input, messages)({ title: 'Le SMIC', body: '' }))).toEqual(
      Either.right({ title: 'Le SMIC', body: '' }),
    )
  })

  it('names every field at fault with the message of the form', async () => {
    expect(await run(fieldsOf(Input, messages)({ title: 'Ab', body: '' }))).toEqual(
      Either.left(new Invalid({ title: 'Le titre est trop court.' })),
    )
  })

  it('refuses the whole form when the field at fault has no message', async () => {
    expect(await run(fieldsOf(Input, messages)({ title: 'Le SMIC', body: 3 }))).toEqual(
      Either.left(new Rejected(INVALID_FORM)),
    )
  })
})

describe('found and free', () => {
  it('hands what was found, or refuses on the field', async () => {
    expect(await run(found('Introuvable.')({ id: 1 }))).toEqual(Either.right({ id: 1 }))
    expect(await run(found('Introuvable.', 'positionId')(null))).toEqual(
      Either.left(new Rejected('Introuvable.', 'positionId')),
    )
  })

  it('lets a free value through, refuses a taken one', async () => {
    expect(await run(free('Déjà pris.', 'title')(null))).toEqual(Either.right(undefined))
    expect(await run(free('Déjà pris.', 'title')({ id: 1 }))).toEqual(
      Either.left(new Rejected('Déjà pris.', 'title')),
    )
  })
})
