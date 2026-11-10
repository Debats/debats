import { describe, expect, it } from 'vitest'
import { admissible, Revision, RevisionRequest } from './draft-revision'

const REQUEST: RevisionRequest = {
  fields: [
    { field: 'subjectTitle', label: 'Titre du sujet', value: 'L’augmentation du SMIC' },
    { field: 'quote', label: 'Citation', value: 'Il faut augmenter le SMIC.' },
  ],
  locked: ['quote'],
  catalogue: {
    author: { kind: 'public_figure', found: true },
    subject: { found: false },
    similarSubjects: [{ id: 's1', title: 'Le montant du SMIC' }],
    positions: [{ id: 'p1', title: 'Il faut augmenter le SMIC' }],
  },
  source: null,
  history: [],
  request: '',
}

const REVISION: Revision = {
  reply: 'Voilà.',
  advice: [
    { field: 'subjectTitle', verdict: 'problem', note: 'Le titre porte un avis.' },
    { field: 'positionTitle', verdict: 'ok', note: 'Inventé.' },
  ],
  changes: [
    { field: 'subjectTitle', value: 'Le montant du SMIC' },
    { field: 'quote', value: 'Reformulée.' },
    { field: 'positionTitle', value: 'Pas donné.' },
  ],
  choices: [
    {
      label: 'Rattacher au sujet existant',
      changes: [
        { field: 'existingSubject', value: 's1' },
        { field: 'existingPosition', value: 'p1' },
      ],
    },
    { label: 'Rattacher à un sujet inventé', changes: [{ field: 'existingSubject', value: 'x' }] },
  ],
  suggestions: ['Raccourcis la présentation'],
}

describe('admissible', () => {
  it('keeps a change on a field it was given and nobody locked', () => {
    expect(admissible(REVISION, REQUEST).changes).toEqual([
      { field: 'subjectTitle', value: 'Le montant du SMIC' },
    ])
  })

  it('drops the advice about a field it was not given', () => {
    expect(admissible(REVISION, REQUEST).advice.map((a) => a.field)).toEqual(['subjectTitle'])
  })

  /* An id the catalogue did not list is an invention, and a choice with nothing left is no choice */
  it('keeps an attachment only to what the catalogue listed', () => {
    expect(admissible(REVISION, REQUEST).choices).toEqual([
      {
        label: 'Rattacher au sujet existant',
        changes: [
          { field: 'existingSubject', value: 's1' },
          { field: 'existingPosition', value: 'p1' },
        ],
      },
    ])
  })

  it('leaves the reply and the suggestions as they are', () => {
    const kept = admissible(REVISION, REQUEST)
    expect(kept.reply).toBe('Voilà.')
    expect(kept.suggestions).toEqual(['Raccourcis la présentation'])
  })
})
