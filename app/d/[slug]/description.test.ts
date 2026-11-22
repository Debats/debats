import { describe, expect, it } from 'vitest'
import { jointDeclarationDescription } from './description'

const figure = { kind: 'public_figure' as const }

describe('jointDeclarationDescription', () => {
  it('counts the signatories the site knows', () => {
    expect(jointDeclarationDescription({ title: 'Le Manifeste de Paris' }, [figure, figure])).toBe(
      'Le Manifeste de Paris — 2 signataires sur Débats.co, et les positions que le texte prend.',
    )
  })

  it('prefers what the text is in a line to its title', () => {
    expect(
      jointDeclarationDescription(
        { title: 'Le Manifeste de Paris', presentation: 'Un appel à taxer les très hauts revenus' },
        [figure],
      ),
    ).toBe(
      'Un appel à taxer les très hauts revenus — 1 signataire sur Débats.co, et les positions que le texte prend.',
    )
  })

  it('does not count nothing when no signature is recorded', () => {
    expect(jointDeclarationDescription({ title: 'Le Manifeste de Paris' }, [])).toBe(
      'Le Manifeste de Paris — les positions que le texte prend, sur Débats.co.',
    )
  })
})
