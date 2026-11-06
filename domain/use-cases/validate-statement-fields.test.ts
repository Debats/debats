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

  /** Noon in Paris on the day the valid fields were stated */
  const today = new Date('2026-02-14T11:00:00Z')

  it('hands a named and linked source as decoded', async () => {
    expect(await run(statementFields(valid, today))).toEqual(Either.right(valid))
  })

  it('requires the link, because a statement nobody can check is worthless', async () => {
    expect(faults(await run(statementFields({ ...valid, sourceUrl: '' }, today)))).toEqual([
      'sourceUrl',
    ])
  })

  it('requires the name of the source', async () => {
    expect(faults(await run(statementFields({ ...valid, sourceName: '' }, today)))).toEqual([
      'sourceName',
    ])
  })

  it('refuses a malformed date', async () => {
    expect(faults(await run(statementFields({ ...valid, statedAt: '14/02/2026' }, today)))).toEqual(
      ['statedAt'],
    )
  })

  it('refuses a date the day has not reached: nobody states tomorrow', async () => {
    expect(faults(await run(statementFields({ ...valid, statedAt: '2026-02-15' }, today)))).toEqual(
      ['statedAt'],
    )
  })

  it('accepts the day itself, which is where most statements are entered from', async () => {
    expect(await run(statementFields({ ...valid, statedAt: '2026-02-14' }, today))).toEqual(
      Either.right({ ...valid, statedAt: '2026-02-14' }),
    )
  })

  it('reads the day in Paris, not in UTC: a statement entered late is still today', async () => {
    // 23:30 in Paris on 14 February is 22:30 UTC the same day
    const lateEvening = new Date('2026-02-14T22:30:00Z')
    expect(await run(statementFields({ ...valid, statedAt: '2026-02-14' }, lateEvening))).toEqual(
      Either.right({ ...valid, statedAt: '2026-02-14' }),
    )
  })

  it('reads the day in Paris when UTC is still the day before', async () => {
    // 00:30 in Paris on 15 February is 23:30 UTC on the 14th
    const justPastMidnight = new Date('2026-02-14T23:30:00Z')
    expect(
      await run(statementFields({ ...valid, statedAt: '2026-02-15' }, justPastMidnight)),
    ).toEqual(Either.right({ ...valid, statedAt: '2026-02-15' }))
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
