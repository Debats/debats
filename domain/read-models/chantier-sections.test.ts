import { describe, expect, it } from 'vitest'
import { makeDraft } from '../use-cases/draft-test-helpers'
import { DraftResolution } from '../use-cases/resolve-draft'
import { chantierSections, ReviewableDraft } from './chantier-sections'

const found = { found: true as const, entity: { id: 'x', title: 'x', slug: 'x', name: 'x' } }
const missing = { found: false as const, canCreate: true }

const item = (
  id: string,
  subjectTitle: string,
  positionTitle: string,
  known: { subject: boolean; position: boolean },
  section: string | null = null,
): ReviewableDraft => ({
  draft: makeDraft({ id, subjectTitle, positionTitle, section }),
  resolution: {
    author: found,
    subject: known.subject ? found : missing,
    position: known.position ? found : missing,
    arguments: [],
    occupations: [],
    affiliations: [],
    canValidate: true,
  } as DraftResolution,
})

const titles = (sections: { title: string }[]) => sections.map(({ title }) => title)
const ids = (sections: { items: ReviewableDraft[] }[]) =>
  sections.map(({ items }) => items.map(({ draft }) => draft.id))

describe('chantierSections', () => {
  describe('until the agent ranges anything, by what a validation would change', () => {
    it('reads the quick ones first, then new positions, then one section per new subject', () => {
      const sections = chantierSections(
        [
          item('d1', 'Le nucléaire', 'Pour', { subject: false, position: false }),
          item('d2', 'La laïcité', 'Contre', { subject: true, position: true }),
          item('d3', 'La laïcité', 'Nuancé', { subject: true, position: false }),
          item('d4', 'Les retraites', 'Contre', { subject: false, position: false }),
          item('d5', 'Le nucléaire', 'Contre', { subject: false, position: false }),
        ],
        [],
      )

      expect(titles(sections)).toEqual([
        'Tout est déjà là',
        'Nouvelles positions',
        'Nouveau sujet : Le nucléaire',
        'Nouveau sujet : Les retraites',
      ])
      expect(ids(sections)).toEqual([['d2'], ['d3'], ['d5', 'd1'], ['d4']])
    })

    it('keeps related drafts side by side, by subject then by position', () => {
      const [ready] = chantierSections(
        [
          item('d1', 'Les retraites', 'Pour', { subject: true, position: true }),
          item('d2', 'La laïcité', 'Pour', { subject: true, position: true }),
          item('d3', 'La laïcité', 'Contre', { subject: true, position: true }),
        ],
        [],
      )
      expect(ready.items.map(({ draft }) => draft.id)).toEqual(['d3', 'd2', 'd1'])
    })

    it('shows no empty section', () => {
      expect(chantierSections([], [])).toEqual([])
      expect(
        titles(
          chantierSections(
            [item('d1', 'La laïcité', 'Pour', { subject: true, position: true })],
            [],
          ),
        ),
      ).toEqual(['Tout est déjà là'])
    })
  })

  describe('once the agent ranges the drafts', () => {
    const known = { subject: true, position: true }

    it('reads the sections in the order the agent declared, then the ones it did not, then the rest', () => {
      const sections = chantierSections(
        [
          item('d1', 'A', 'x', known, 'Zemmour'),
          item('d2', 'B', 'x', known, 'Candidates'),
          item('d3', 'C', 'x', known, null),
          item('d4', 'D', 'x', known, 'Bardella'),
          item('d5', 'E', 'x', known, 'Candidates'),
        ],
        ['Candidates', 'Zemmour'],
      )

      expect(titles(sections)).toEqual(['Candidates', 'Zemmour', 'Bardella', 'Sans section'])
      expect(ids(sections)).toEqual([['d2', 'd5'], ['d1'], ['d4'], ['d3']])
    })

    it('ranges by the drafts alone when the agent declared no order', () => {
      const sections = chantierSections(
        [item('d1', 'A', 'x', known, 'Tribune'), item('d2', 'B', 'x', known, 'Interviews')],
        [],
      )
      expect(titles(sections)).toEqual(['Interviews', 'Tribune'])
    })

    it('leaves out a declared section that holds nothing yet', () => {
      const sections = chantierSections(
        [item('d1', 'A', 'x', known, 'Faits')],
        ['Faits', 'À venir'],
      )
      expect(titles(sections)).toEqual(['Faits'])
    })
  })
})
