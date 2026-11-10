import { describe, expect, it } from 'vitest'
import { EMPTY_CONTENT_INPUT } from '../../../domain/use-cases/validate-statement-fields'
import { AmendValues, applyChanges, fieldsToRevise, quoteOf, withValue } from './revision-fields'

const VALUES: AmendValues = {
  authorMode: 'existing',
  authorName: 'Marine Tondelier',
  authorPresentation: '',
  authorWikipedia: '',
  authorNotorietySources: ['', ''],
  authorOrganisationType: 'association',
  subjectMode: 'new',
  subjectId: null,
  subjectTitle: 'L’augmentation du SMIC',
  subjectPresentation: 'Le salaire minimum.',
  subjectProblem: 'Faut-il l’augmenter ?',
  positionMode: 'new',
  selectedPositionId: '',
  positionTitle: 'Il faut augmenter le SMIC',
  positionDescription: 'De 10 %.',
  sourceName: 'Le Monde',
  content: { ...EMPTY_CONTENT_INPUT, quote: 'Il faut augmenter le SMIC de 10 %.' },
}

const ATTACHABLE = {
  subjects: [{ id: 's1', title: 'Le montant du SMIC' }],
  positions: [{ id: 'p1', title: 'Il faut augmenter le SMIC' }],
}

describe('fieldsToRevise', () => {
  it('reads what is being written, in the order of the form, and not what was chosen', () => {
    expect(fieldsToRevise(VALUES).map((f) => [f.field, f.value])).toEqual([
      ['subjectTitle', 'L’augmentation du SMIC'],
      ['subjectPresentation', 'Le salaire minimum.'],
      ['subjectProblem', 'Faut-il l’augmenter ?'],
      ['positionTitle', 'Il faut augmenter le SMIC'],
      ['positionDescription', 'De 10 %.'],
      ['sourceName', 'Le Monde'],
      ['quote', 'Il faut augmenter le SMIC de 10 %.'],
    ])
  })

  it('reads the content fields of the chosen nature only', () => {
    const vote = {
      ...VALUES,
      content: { ...VALUES.content, statementType: 'vote', votedText: 'PPL' },
    }

    expect(fieldsToRevise(vote).map((f) => f.field)).toContain('votedText')
    expect(fieldsToRevise(vote).map((f) => f.field)).not.toContain('quote')
    expect(quoteOf(vote.content)).toBeUndefined()
  })
})

describe('applyChanges', () => {
  it('writes the new text and remembers the old one', () => {
    const { values, revised } = applyChanges(
      VALUES,
      [
        { field: 'subjectTitle', value: 'Le montant du SMIC' },
        { field: 'quote', value: 'Il faut augmenter le SMIC de 10 %.' },
      ],
      ATTACHABLE,
    )

    expect(values.subjectTitle).toBe('Le montant du SMIC')
    expect(revised).toEqual({ subjectTitle: 'L’augmentation du SMIC' })
  })

  it('attaches to an existing subject as a person would choose it', () => {
    const { values, revised } = applyChanges(
      VALUES,
      [
        { field: 'existingSubject', value: 's1' },
        { field: 'existingPosition', value: 'p1' },
      ],
      ATTACHABLE,
    )

    expect(values).toMatchObject({
      subjectMode: 'existing',
      subjectId: 's1',
      subjectTitle: 'Le montant du SMIC',
      positionMode: 'existing',
      selectedPositionId: 'p1',
    })
    expect(revised).toEqual({})
  })

  it('ignores an attachment to an entity the form does not know', () => {
    expect(
      applyChanges(VALUES, [{ field: 'existingSubject', value: 'x' }], ATTACHABLE).values,
    ).toBe(VALUES)
  })
})

describe('withValue', () => {
  it('writes a content field inside the content', () => {
    expect(withValue(VALUES, 'quote', 'Autre.').content.quote).toBe('Autre.')
    expect(withValue(VALUES, 'sourceName', 'Libé').sourceName).toBe('Libé')
  })
})
