import { describe, expect, it } from 'vitest'
import { EMPTY_CONTENT_INPUT } from '../../../domain/use-cases/validate-statement-fields'
import { contributionToRead, WrittenContribution } from './contribution-to-read'

const chosen = { id: 'x', label: 'Chosen' }

/** Everything chosen among the existing, nothing typed but the statement itself */
const WRITTEN: WrittenContribution = {
  author: {
    kind: 'public_figure',
    figure: {
      creating: false,
      chosen: { id: 'f1', label: 'Marine Tondelier' },
      draft: { name: 'Brouillon abandonné', presentation: '', wikipediaUrl: '', websiteUrl: '' },
    },
    organisation: {
      creating: false,
      chosen,
      draft: {
        name: '',
        acronym: '',
        organisationType: '',
        presentation: '',
        wikipediaUrl: '',
        websiteUrl: '',
      },
    },
  },
  topic: {
    subject: {
      creating: false,
      chosen: { id: 's1', label: 'Le montant du SMIC' },
      draft: { title: '', presentation: '', problem: '' },
    },
    position: {
      creating: false,
      chosenId: 'p2',
      options: [
        { id: 'p1', title: 'Il faut geler le SMIC' },
        { id: 'p2', title: 'Il faut augmenter le SMIC' },
      ],
      draft: { title: '', description: '' },
    },
  },
  content: { ...EMPTY_CONTENT_INPUT, quote: 'Il faut augmenter le SMIC de 10 %.' },
  source: { sourceName: 'Le Monde', sourceUrl: 'https://lemonde.fr/x' },
}

describe('contributionToRead', () => {
  it('sends what was typed as fields and what was chosen as context', () => {
    expect(contributionToRead(WRITTEN)).toEqual({
      fields: [
        { field: 'quote', label: 'Citation', value: 'Il faut augmenter le SMIC de 10 %.' },
        { field: 'sourceName', label: 'Nom de la source', value: 'Le Monde' },
        { field: 'sourceUrl', label: 'Adresse de la source', value: 'https://lemonde.fr/x' },
      ],
      context: [
        { label: 'Sujet choisi', value: 'Le montant du SMIC' },
        { label: 'Position choisie', value: 'Il faut augmenter le SMIC' },
      ],
    })
  })

  /* A panel that was opened then closed leaves its draft behind: it is not being written */
  it('reads a draft only while its panel is open', () => {
    const { fields } = contributionToRead(WRITTEN)

    expect(fields.map((f) => f.field)).not.toContain('figureName')
  })

  it('reads a subject and its first position as fields, not as context', () => {
    const { fields, context } = contributionToRead({
      ...WRITTEN,
      topic: {
        subject: {
          creating: true,
          chosen: undefined,
          draft: { title: 'La fin de vie', presentation: 'Le cadre légal.', problem: 'Faut-il ?' },
        },
        position: {
          creating: true,
          chosenId: '',
          options: [],
          draft: { title: 'Pour une aide active à mourir', description: 'Encadrée.' },
        },
      },
    })

    expect(fields.map((f) => [f.field, f.value])).toEqual([
      ['subjectTitle', 'La fin de vie'],
      ['subjectPresentation', 'Le cadre légal.'],
      ['subjectProblem', 'Faut-il ?'],
      ['positionTitle', 'Pour une aide active à mourir'],
      ['positionDescription', 'Encadrée.'],
      ['quote', 'Il faut augmenter le SMIC de 10 %.'],
      ['sourceName', 'Le Monde'],
      ['sourceUrl', 'https://lemonde.fr/x'],
    ])
    expect(context).toEqual([])
  })

  it('reads the author being created, whichever kind speaks', () => {
    const { fields } = contributionToRead({
      ...WRITTEN,
      author: {
        ...WRITTEN.author,
        kind: 'organisation',
        organisation: {
          creating: true,
          chosen: undefined,
          draft: { ...WRITTEN.author.organisation.draft, name: 'CGT', presentation: 'Syndicat.' },
        },
      },
    })

    expect(fields.slice(0, 2)).toEqual([
      { field: 'organisationName', label: 'Nom de l’organisation', value: 'CGT' },
      {
        field: 'organisationPresentation',
        label: 'Présentation de l’organisation',
        value: 'Syndicat.',
      },
    ])
  })

  /* The content fields follow the statement's nature: the others are not even rendered */
  it('reads the content fields of the chosen nature only', () => {
    const { fields } = contributionToRead({
      ...WRITTEN,
      content: { ...WRITTEN.content, statementType: 'vote', votedText: 'Loi n° 42', deed: 'x' },
    })

    expect(fields.map((f) => f.field)).toEqual(['votedText', 'sourceName', 'sourceUrl'])
  })
})
