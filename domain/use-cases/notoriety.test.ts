import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { Invalid } from './types'
import {
  NOT_A_WIKIPEDIA_ARTICLE,
  notorietyFaults,
  UNABLE_TO_CHECK_WIKIPEDIA,
  wikipediaPageJudged,
} from './notoriety'

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
  /** The page judged, with the validator the test provides */
  const judged = (validator: WikipediaValidator) =>
    Effect.provideService(wikipediaPageJudged(page, biographyOnly), WikipediaValidator, validator)

  /*
   * A category exists, is not a person, and describes nobody: judged on those
   * two answers alone it satisfied an organisation's notoriety criterion, and
   * « Catégorie:Association française » passed for a proof of notoriety.
   */
  it('refuses a page that is not an article, before judging what it describes', async () => {
    let judged = false
    const category = {
      validatePage: async () => ({ exists: true, isArticle: false, isBiography: false }),
    }

    const result = await run(
      Effect.provideService(
        wikipediaPageJudged(page, (p) => {
          judged = true
          return biographyOnly(p)
        }),
        WikipediaValidator,
        category,
      ),
    )

    expect(result).toEqual(Either.left(new Invalid({ wikipediaUrl: NOT_A_WIKIPEDIA_ARTICLE })))
    expect(judged).toBe(false)
  })

  it('refuses a page that does not exist, then one the command judges wrong', async () => {
    const missing = {
      validatePage: async () => ({ exists: false, isArticle: false, isBiography: false }),
    }
    const notABiography = {
      validatePage: async () => ({ exists: true, isArticle: true, isBiography: false }),
    }

    expect(await run(judged(missing))).toEqual(
      Either.left(new Invalid({ wikipediaUrl: 'La page Wikipédia n’existe pas.' })),
    )
    expect(await run(judged(notABiography))).toEqual(
      Either.left(new Invalid({ wikipediaUrl: 'Pas une biographie.' })),
    )
  })

  /*
   * Ni « la page n'existe pas », ni un passage sans contrôle : le site dit
   * qu'il n'a pas pu vérifier. Le critère de notoriété laisse une issue — deux
   * sources indépendantes tiennent lieu de page Wikipédia — donc un refus
   * pendant une panne n'enferme personne.
   */
  it('says it could not check when the validator cannot be reached', async () => {
    const down = {
      validatePage: async () => {
        throw new Error('timeout')
      },
    }

    expect(await run(judged(down))).toEqual(
      Either.left(new Invalid({ wikipediaUrl: UNABLE_TO_CHECK_WIKIPEDIA })),
    )
  })

  it('tries once more before giving up: a hiccup is not an outage', async () => {
    let calls = 0
    const hiccup = {
      validatePage: async () => {
        calls += 1
        if (calls === 1) throw new Error('connexion perdue')
        return { exists: true, isArticle: true, isBiography: true }
      },
    }

    expect(await run(judged(hiccup))).toEqual(Either.right(undefined))
    expect(calls).toBe(2)
  })

  it('does not retry a page it could read and judged wrong', async () => {
    let calls = 0
    const notABiography = {
      validatePage: async () => {
        calls += 1
        return { exists: true, isArticle: true, isBiography: false }
      },
    }

    expect(await run(judged(notABiography))).toEqual(
      Either.left(new Invalid({ wikipediaUrl: 'Pas une biographie.' })),
    )
    expect(calls).toBe(1)
  })
})
