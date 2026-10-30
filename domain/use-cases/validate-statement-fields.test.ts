import { describe, expect, it } from 'vitest'
import { Effect, Either } from 'effect'
import { Invalid } from './types'
import {
  statementContent,
  StatementContentInput,
  statementFields,
} from './validate-statement-fields'

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.either(effect))

const QUOTE = 'Une citation suffisamment longue pour être valide.'

const EMPTY: StatementContentInput = {
  statementType: '',
  quote: '',
  document: '',
  votedText: '',
  choice: '',
  deed: '',
}

/** The field each refusal blames, which is what the form shows it under */
const faults = <A, E>(outcome: Either.Either<A, E>) =>
  Either.isLeft(outcome) && outcome.left instanceof Invalid
    ? Object.keys(outcome.left.fields).sort()
    : outcome

describe('statementFields', () => {
  const valid = {
    sourceName: 'Le Monde',
    sourceUrl: 'https://www.lemonde.fr/article',
    statedAt: '2026-02-14',
  }

  it('hands a named and linked source as decoded', async () => {
    expect(await run(statementFields(valid))).toEqual(Either.right(valid))
  })

  it('requires the link, because a statement nobody can check is worthless', async () => {
    expect(faults(await run(statementFields({ ...valid, sourceUrl: '' })))).toEqual(['sourceUrl'])
  })

  it('requires the name of the source', async () => {
    expect(faults(await run(statementFields({ ...valid, sourceName: '' })))).toEqual(['sourceName'])
  })

  it('refuses a malformed date', async () => {
    expect(faults(await run(statementFields({ ...valid, statedAt: '14/02/2026' })))).toEqual([
      'statedAt',
    ])
  })
})

describe('statementContent', () => {
  it('reads a declaration', async () => {
    const outcome = await run(
      statementContent({ ...EMPTY, statementType: 'declaration', quote: QUOTE }),
    )

    expect(outcome).toEqual(Either.right({ kind: 'declaration', quote: QUOTE }))
  })

  it('blames the quote a declaration lacks', async () => {
    const outcome = await run(
      statementContent({ ...EMPTY, statementType: 'declaration', quote: 'court' }),
    )

    expect(Either.isLeft(outcome) && outcome.left).toEqual(
      new Invalid({ quote: 'La citation doit faire au moins 10 caractères.' }),
    )
  })

  it('reads a programme with the document it is quoted from', async () => {
    const outcome = await run(
      statementContent({
        ...EMPTY,
        statementType: 'program',
        document: "L'Avenir en commun",
        quote: QUOTE,
      }),
    )

    expect(outcome).toEqual(
      Either.right({ kind: 'program', document: "L'Avenir en commun", quote: QUOTE }),
    )
  })

  it('asks for the document of a programme', async () => {
    const outcome = await run(
      statementContent({ ...EMPTY, statementType: 'program', quote: QUOTE }),
    )

    expect(faults(outcome)).toEqual(['document'])
  })

  it('reads a vote as the text put to the ballot and the way it went', async () => {
    const outcome = await run(
      statementContent({
        ...EMPTY,
        statementType: 'vote',
        votedText: 'Proposition de loi sur la fin de vie',
        choice: 'contre',
      }),
    )

    expect(outcome).toEqual(
      Either.right({
        kind: 'vote',
        votedText: 'Proposition de loi sur la fin de vie',
        choice: 'contre',
      }),
    )
  })

  it('asks for the text put to the ballot', async () => {
    const outcome = await run(statementContent({ ...EMPTY, statementType: 'vote', choice: 'pour' }))

    expect(faults(outcome)).toEqual(['votedText'])
  })

  it('refuses a vote that says nothing', async () => {
    const outcome = await run(
      statementContent({
        ...EMPTY,
        statementType: 'vote',
        votedText: 'Proposition de loi',
        choice: 'non-votant',
      }),
    )

    expect(faults(outcome)).toEqual(['choice'])
  })

  it('leaves aside a quote typed before the type was changed to a vote', async () => {
    const outcome = await run(
      statementContent({
        ...EMPTY,
        statementType: 'vote',
        votedText: 'Proposition de loi',
        choice: 'pour',
        quote: QUOTE,
      }),
    )

    expect(outcome).toEqual(
      Either.right({ kind: 'vote', votedText: 'Proposition de loi', choice: 'pour' }),
    )
  })

  it('reads an act as what was done', async () => {
    const outcome = await run(
      statementContent({
        ...EMPTY,
        statementType: 'act',
        deed: 'Cosignature de la proposition de loi n° 575',
      }),
    )

    expect(outcome).toEqual(
      Either.right({ kind: 'act', deed: 'Cosignature de la proposition de loi n° 575' }),
    )
  })

  it('asks what the act was', async () => {
    expect(faults(await run(statementContent({ ...EMPTY, statementType: 'act' })))).toEqual([
      'deed',
    ])
  })

  it('refuses a deed too long to read at a glance', async () => {
    const outcome = await run(
      statementContent({ ...EMPTY, statementType: 'act', deed: 'x'.repeat(151) }),
    )

    expect(faults(outcome)).toEqual(['deed'])
  })

  it('refuses a type that is not one of the four', async () => {
    expect(faults(await run(statementContent({ ...EMPTY, statementType: 'tweet' })))).toEqual([
      'statementType',
    ])
  })
})
