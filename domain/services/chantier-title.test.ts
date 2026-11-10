import { describe, expect, it } from 'vitest'
import { chantierTitle, withoutTitleLine } from './chantier-title'

describe('chantierTitle', () => {
  it('takes the title line the agent opens its first answer with', () => {
    const answer = '# La taxe Zucman\n\nVoici comment je compte m’y prendre…'
    expect(chantierTitle('Qui s’est positionné sur l’impôt plancher ?', answer)).toBe(
      'La taxe Zucman',
    )
  })

  it('finds the title line even after a blank line', () => {
    expect(chantierTitle('brief', '\n\n#  Le blocage des lycées  \nsuite')).toBe(
      'Le blocage des lycées',
    )
  })

  it('names the chantier after its brief when the agent gave no title line', () => {
    expect(chantierTitle('Qui a réagi au blocage des lycées cette semaine ?', 'Je commence.')).toBe(
      'Qui a réagi au blocage des lycées cette semaine ?',
    )
  })

  it('names the chantier after its brief before any answer', () => {
    expect(chantierTitle('  Marine Tondelier   sur les sujets du catalogue ')).toBe(
      'Marine Tondelier sur les sujets du catalogue',
    )
  })

  it('cuts a long brief at a word', () => {
    const brief =
      'Cartographier qui s’est positionné sur l’impôt plancher de 2 % sur les patrimoines de plus de 100 millions d’euros, tout le spectre'
    const title = chantierTitle(brief)
    expect(title.length).toBeLessThanOrEqual(81)
    expect(title.endsWith('…')).toBe(true)
    expect(title).not.toMatch(/\s…$/)
    expect(brief.startsWith(title.slice(0, -1))).toBe(true)
  })
})

describe('withoutTitleLine', () => {
  it('drops the title line and what surrounds it', () => {
    expect(withoutTitleLine('# La taxe Zucman\n\nJe commence par le Sénat.')).toBe(
      'Je commence par le Sénat.',
    )
  })

  it('leaves an answer without a title line as it is', () => {
    expect(withoutTitleLine('Je commence par le Sénat.')).toBe('Je commence par le Sénat.')
  })
})
