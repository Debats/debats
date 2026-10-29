import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { Invalid } from './types'
import { publicFigureFields } from './validate-public-figure-fields'

const wikipediaValidator: WikipediaValidator = {
  validatePage: async () => ({ exists: true, isBiography: true }),
}

const run = <A, E>(effect: Effect.Effect<A, E, WikipediaValidator>) =>
  Effect.runPromise(
    Effect.either(Effect.provideService(effect, WikipediaValidator, wikipediaValidator)),
  )

describe('publicFigureFields', () => {
  it('hands the name and the presentation as decoded, for the command to write', async () => {
    const outcome = await run(
      publicFigureFields({
        name: 'Jean Dupont',
        presentation: 'Un personnage public suffisamment connu.',
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
        notorietySources: [],
      }),
    )
    expect(outcome).toEqual(
      Either.right({
        name: 'Jean Dupont',
        presentation: 'Un personnage public suffisamment connu.',
      }),
    )
  })

  it('gathers the faults of the fields and of the notoriety before refusing', async () => {
    const outcome = await run(
      publicFigureFields({
        name: 'A',
        presentation: 'Court',
        wikipediaUrl: '',
        notorietySources: ['https://example.org/one'],
      }),
    )
    expect(Either.isLeft(outcome) && outcome.left).toBeInstanceOf(Invalid)
    expect(Either.isLeft(outcome) && Object.keys(outcome.left.fields).sort()).toEqual([
      'name',
      'notorietySources',
      'presentation',
    ])
  })
})
