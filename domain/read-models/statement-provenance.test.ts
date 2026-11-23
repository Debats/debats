import { describe, expect, it } from 'vitest'
import { provenanceOf, provenanceOfText } from './statement-provenance'

const interview = {
  statementType: 'declaration' as const,
  sourceName: 'France Inter',
  sourceUrl: 'https://franceinter.fr/interview',
}

const manifesto = { id: 'jd-1', title: 'Le Manifeste de Paris', slug: 'le-manifeste-de-paris' }

describe('provenanceOf', () => {
  it('names a statement of the author’s own by its type, and leads to its source', () => {
    expect(provenanceOf(interview)).toEqual({
      label: 'Déclaration',
      name: 'France Inter',
      link: { kind: 'source', url: 'https://franceinter.fr/interview' },
    })
  })

  it('names a vote, a programme or an act by its own type', () => {
    expect(provenanceOf({ ...interview, statementType: 'vote' }).label).toBe('Vote')
    expect(provenanceOf({ ...interview, statementType: 'act' }).label).toBe('Acte')
  })

  it('names the signature of a joint declaration as such, by the title of the text, and leads to its page', () => {
    expect(provenanceOf({ ...interview, jointDeclaration: manifesto })).toEqual({
      label: 'Déclaration commune',
      name: 'Le Manifeste de Paris',
      link: { kind: 'page', href: '/d/le-manifeste-de-paris' },
    })
  })

  it('names a source without an address, and leads nowhere', () => {
    expect(provenanceOf({ ...interview, sourceUrl: null })).toEqual({
      label: 'Déclaration',
      name: 'France Inter',
      link: null,
    })
  })
})

describe('provenanceOfText', () => {
  it('names a joint declaration as such, by its source, and leads to it', () => {
    expect(provenanceOfText({ name: 'Le Monde', url: 'https://lemonde.fr/manifeste' })).toEqual({
      label: 'Déclaration commune',
      name: 'Le Monde',
      link: { kind: 'source', url: 'https://lemonde.fr/manifeste' },
    })
  })
})
