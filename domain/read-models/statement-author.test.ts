import { describe, it, expect } from 'vitest'
import {
  authorHref,
  authorOnSubjectHref,
  organisationRef,
  publicFigureRef,
} from './statement-author'

const figure = publicFigureRef({ id: 'f1', name: 'Simone Veil', slug: 'simone-veil' })
const organisation = organisationRef({
  id: 'o1',
  name: 'Attac France',
  slug: 'attac',
  acronym: 'Attac',
})

describe('statement author references', () => {
  it('tags each reference with its kind', () => {
    expect(figure.kind).toBe('public_figure')
    expect(figure.acronym).toBeNull()
    expect(organisation.kind).toBe('organisation')
  })

  it('links a public figure to their page and to their page on a subject', () => {
    expect(authorHref(figure)).toBe('/p/simone-veil')
    expect(authorOnSubjectHref(figure, 'l-ivg')).toBe('/p/simone-veil/s/l-ivg')
  })

  it('links an organisation to its page and to its page on a subject', () => {
    expect(authorHref(organisation)).toBe('/o/attac')
    expect(authorOnSubjectHref(organisation, 'l-ivg')).toBe('/o/attac/s/l-ivg')
  })
})
