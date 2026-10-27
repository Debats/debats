import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { Invalid } from './types'
import { notorietyFaults, wikipediaPageJudged } from './notoriety'

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.either(effect))

const page = 'https://fr.wikipedia.org/wiki/Simone_Veil'
const biographyOnly = (p: { isBiography: boolean }) =>
  p.isBiography ? null : 'Pas une biographie.'

describe('notorietyFaults', () => {
  it('accepts a Wikipedia page, and refuses one that is not a page', () => {
    expect(notorietyFaults(page, [])).toEqual({})
    expect(notorietyFaults('https://example.org', [])).toMatchObject({
      wikipediaUrl: expect.stringContaining('invalide'),
    })
  })

  it('wants two sources without a page, each a URL', () => {
    expect(notorietyFaults('', ['https://lemonde.fr/a'])).toMatchObject({
      notorietySources: expect.stringContaining('au moins 2'),
    })
    expect(notorietyFaults('', ['https://lemonde.fr/a', 'pas-une-url'])).toMatchObject({
      notorietySources: expect.stringContaining('URLs valides'),
    })
    expect(notorietyFaults('', ['https://lemonde.fr/a', 'https://liberation.fr/b'])).toEqual({})
  })
})

describe('wikipediaPageJudged', () => {
  it('refuses a page that does not exist, then one the command judges wrong', async () => {
    const missing = { validatePage: async () => ({ exists: false, isBiography: false }) }
    const notABiography = { validatePage: async () => ({ exists: true, isBiography: false }) }

    expect(await run(wikipediaPageJudged(page, missing, biographyOnly))).toEqual(
      Either.left(new Invalid({ wikipediaUrl: 'La page Wikipedia n’existe pas.' })),
    )
    expect(await run(wikipediaPageJudged(page, notABiography, biographyOnly))).toEqual(
      Either.left(new Invalid({ wikipediaUrl: 'Pas une biographie.' })),
    )
  })

  it('lets a page the validator cannot reach through', async () => {
    const down = {
      validatePage: async () => {
        throw new Error('timeout')
      },
    }

    expect(await run(wikipediaPageJudged(page, down, biographyOnly))).toEqual(
      Either.right(undefined),
    )
  })
})
