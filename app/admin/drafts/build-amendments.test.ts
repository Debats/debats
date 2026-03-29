import { describe, it, expect } from 'vitest'
import { buildAmendments, AmendFormState } from './build-amendments'
import { DraftStatement } from '../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../domain/use-cases/resolve-draft'

function makeDraft(overrides: Partial<DraftStatement> = {}): DraftStatement {
  return {
    id: 'draft-1',
    quote: 'Citation originale du brouillon',
    sourceName: 'Le Monde',
    sourceUrl: 'https://lemonde.fr',
    date: '2024-01-15',
    aiNotes: null,
    publicFigureName: 'Jean-Luc Mélenchon',
    subjectTitle: "L'immigration",
    positionTitle: 'Régularisation des sans-papiers',
    publicFigureData: {
      presentation: 'Homme politique français.',
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/JLM',
    },
    subjectData: {
      presentation: 'Sujet central.',
      problem: 'Quelle politique ?',
    },
    positionData: { description: 'Régulariser.' },
    origin: 'test',
    status: 'pending',
    rejectionNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const allFoundResolution: DraftResolution = {
  publicFigure: {
    found: true,
    entity: { id: 'pf-1', name: 'Jean-Luc Mélenchon', slug: 'jean-luc-melenchon' },
  },
  subject: { found: true, entity: { id: 'sub-1', title: "L'immigration", slug: 'l-immigration' } },
  position: { found: true, entity: { id: 'pos-1', title: 'Régularisation des sans-papiers' } },
  canValidate: true,
}

const noneFoundResolution: DraftResolution = {
  publicFigure: { found: false, canCreate: true },
  subject: { found: false, canCreate: true },
  position: { found: false, canCreate: true },
  canValidate: true,
}

function makeState(overrides: Partial<AmendFormState> = {}): AmendFormState {
  return {
    figureMode: 'existing',
    figureName: 'Jean-Luc Mélenchon',
    figurePresentation: 'Homme politique français.',
    figureWikipedia: 'https://fr.wikipedia.org/wiki/JLM',
    figureNotorietySources: [],
    subjectMode: 'existing',
    subjectTitle: "L'immigration",
    subjectPresentation: 'Sujet central.',
    subjectProblem: 'Quelle politique ?',
    positionMode: 'existing',
    selectedPositionTitle: 'Régularisation des sans-papiers',
    positionTitle: 'Régularisation des sans-papiers',
    positionDescription: 'Régulariser.',
    sourceName: 'Le Monde',
    quote: 'Citation originale du brouillon',
    ...overrides,
  }
}

describe('buildAmendments', () => {
  it('should return empty amendments when nothing changed', () => {
    const result = buildAmendments(makeDraft(), allFoundResolution, makeState())
    expect(result).toEqual({})
  })

  it('should include quote when changed', () => {
    const result = buildAmendments(
      makeDraft(),
      allFoundResolution,
      makeState({ quote: 'Nouvelle citation' }),
    )
    expect(result).toEqual({ quote: 'Nouvelle citation' })
  })

  it('should include sourceName when changed', () => {
    const result = buildAmendments(
      makeDraft(),
      allFoundResolution,
      makeState({ sourceName: 'Libération' }),
    )
    expect(result).toEqual({ sourceName: 'Libération' })
  })

  it('should set publicFigureData to null when switching to existing with different name', () => {
    const result = buildAmendments(
      makeDraft(),
      noneFoundResolution,
      makeState({ figureMode: 'existing', figureName: 'Marine Le Pen' }),
    )
    expect(result.publicFigureName).toBe('Marine Le Pen')
    expect(result.publicFigureData).toBeNull()
  })

  it('should not send publicFigureData null when entity already exists and name unchanged', () => {
    const result = buildAmendments(makeDraft(), allFoundResolution, makeState())
    expect(result.publicFigureData).toBeUndefined()
  })

  it('should clear creation data when switching to existing with same name but entity was not found before', () => {
    const result = buildAmendments(makeDraft(), noneFoundResolution, makeState())
    expect(result.publicFigureData).toBeNull()
    expect(result.publicFigureName).toBeUndefined()
  })

  it('should include new figure creation data when in new mode with changes', () => {
    const result = buildAmendments(
      makeDraft(),
      noneFoundResolution,
      makeState({ figureMode: 'new', figurePresentation: 'Nouvelle bio.' }),
    )
    expect(result.publicFigureData).toEqual({
      presentation: 'Nouvelle bio.',
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/JLM',
    })
  })

  it('should include position title when selecting a different existing position', () => {
    const result = buildAmendments(
      makeDraft(),
      allFoundResolution,
      makeState({ positionMode: 'existing', selectedPositionTitle: 'Fermeture des frontières' }),
    )
    expect(result.positionTitle).toBe('Fermeture des frontières')
    expect(result.positionData).toBeNull()
  })

  it('should include notoriety sources in figure creation data when provided', () => {
    const draft = makeDraft({
      publicFigureData: { presentation: 'Bio.', notorietySources: [] },
    })
    const result = buildAmendments(
      draft,
      noneFoundResolution,
      makeState({
        figureMode: 'new',
        figurePresentation: 'Bio.',
        figureWikipedia: '',
        figureNotorietySources: ['https://lemonde.fr/article', 'https://liberation.fr/article'],
      }),
    )
    expect(result.publicFigureData).toEqual({
      presentation: 'Bio.',
      notorietySources: ['https://lemonde.fr/article', 'https://liberation.fr/article'],
    })
  })

  it('should filter out empty notoriety sources', () => {
    const draft = makeDraft({
      publicFigureData: { presentation: 'Bio.', notorietySources: [] },
    })
    const result = buildAmendments(
      draft,
      noneFoundResolution,
      makeState({
        figureMode: 'new',
        figurePresentation: 'Bio.',
        figureWikipedia: '',
        figureNotorietySources: ['https://lemonde.fr/article', '', '  '],
      }),
    )
    expect(result.publicFigureData).toEqual({
      presentation: 'Bio.',
      notorietySources: ['https://lemonde.fr/article'],
    })
  })

  it('should include new position data in new mode', () => {
    const result = buildAmendments(
      makeDraft(),
      allFoundResolution,
      makeState({ positionMode: 'new', positionDescription: 'Nouvelle description.' }),
    )
    expect(result.positionData).toEqual({ description: 'Nouvelle description.' })
  })
})
