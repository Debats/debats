import { describe, it, expect } from 'vitest'
import { subjectSynthesis, SynthesisInput } from './author-subject-synthesis'

const input = (over: Partial<SynthesisInput> = {}): SynthesisInput => ({
  statements: 1,
  positionTitles: ['Renationalisation des autoroutes'],
  allies: 0,
  undefended: 0,
  latest: '24 janv. 2022',
  ...over,
})

describe('subjectSynthesis', () => {
  it('says nothing of the statements when the site recenses none', () => {
    expect(subjectSynthesis(input({ statements: 0 })).statements).toBeNull()
  })

  it('dates a lone statement without calling it the last one', () => {
    expect(subjectSynthesis(input()).when).toBe('le 24 janv. 2022')
  })

  it('calls the date the last one once there are several statements', () => {
    expect(subjectSynthesis(input({ statements: 3 })).when).toBe('la dernière le 24 janv. 2022')
  })

  it('has no date when nothing is dated', () => {
    expect(subjectSynthesis(input({ latest: null })).when).toBeNull()
  })

  it('agrees the label with the number of positions, never with the author', () => {
    expect(subjectSynthesis(input()).positionsLabel).toBe('Position défendue')
    expect(subjectSynthesis(input({ positionTitles: ['A', 'B'] })).positionsLabel).toBe(
      'Positions défendues',
    )
  })

  it('names the allies, agreeing with the positions and counting the voices', () => {
    expect(subjectSynthesis(input({ allies: 1 })).shared).toBe(
      'partagée par 1 autre voix recensée ici',
    )
    expect(subjectSynthesis(input({ allies: 3, positionTitles: ['A', 'B'] })).shared).toBe(
      'partagées par 3 autres voix recensées ici',
    )
  })

  it('says the position stands alone when nobody shares it', () => {
    expect(subjectSynthesis(input()).shared).toBe('que personne d’autre n’a encore défendue ici')
  })

  it('counts the positions nobody defends, and says nothing when there are none', () => {
    expect(subjectSynthesis(input({ undefended: 1 })).undefended).toBe(
      '1 autre position reste ouverte sur ce sujet sans que personne ne la défende.',
    )
    expect(subjectSynthesis(input({ undefended: 2 })).undefended).toBe(
      '2 autres positions restent ouvertes sur ce sujet sans que personne ne les défende.',
    )
    expect(subjectSynthesis(input()).undefended).toBeNull()
  })
})
