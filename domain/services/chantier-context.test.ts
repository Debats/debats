import { describe, expect, it } from 'vitest'
import {
  CONTEXT_WORTH_REDUCING,
  HANDOVER_MAX_CHARS,
  HANDOVER_TRUNCATED,
  contextWorthReducing,
  handoverOf,
} from './chantier-context'

const said = (role: 'person' | 'agent' | 'review', text: string) => ({ role, text })

describe('contextWorthReducing', () => {
  it('holds from the threshold on', () => {
    expect(contextWorthReducing(CONTEXT_WORTH_REDUCING)).toBe(true)
    expect(contextWorthReducing(CONTEXT_WORTH_REDUCING + 1)).toBe(true)
  })

  it('does not below it, nor when the size was never read', () => {
    expect(contextWorthReducing(CONTEXT_WORTH_REDUCING - 1)).toBe(false)
    expect(contextWorthReducing(0)).toBe(false)
    expect(contextWorthReducing(null)).toBe(false)
  })
})

describe('handoverOf', () => {
  it('hands over what the person and the agent said, in order, each named', () => {
    expect(
      handoverOf([
        said('person', 'Cherchez côté Sénat.'),
        said('agent', 'Douze brouillons postés.'),
      ]),
    ).toBe('La personne : Cherchez côté Sénat.\n\nVous : Douze brouillons postés.')
  })

  it('leaves the review notices out: the drafts themselves say what became of them', () => {
    expect(
      handoverOf([
        said('agent', 'Douze brouillons postés.'),
        said('review', 'Relecture : brouillon validé.'),
      ]),
    ).toBe('Vous : Douze brouillons postés.')
  })

  it('has nothing to hand over from a thread where nobody spoke', () => {
    expect(handoverOf([])).toBeNull()
    expect(handoverOf([said('review', 'Relecture : brouillon validé.')])).toBeNull()
  })

  it('keeps the latest turns when the thread is too long, whole, and says the start is missing', () => {
    /* With the last message it fits, by a few characters; the first one no longer does */
    const long = 'x'.repeat(HANDOVER_MAX_CHARS - 40)
    const handover = handoverOf([
      said('person', 'Tout premier message.'),
      said('agent', long),
      said('person', 'Dernier message.'),
    ])

    expect(handover).toBe(
      `${HANDOVER_TRUNCATED}\n\nVous : ${long}\n\nLa personne : Dernier message.`,
    )
  })

  it('keeps the last turn even when it alone is too long', () => {
    const huge = 'x'.repeat(HANDOVER_MAX_CHARS + 1)
    expect(handoverOf([said('person', 'Avant.'), said('agent', huge)])).toBe(
      `${HANDOVER_TRUNCATED}\n\nVous : ${huge}`,
    )
  })
})
