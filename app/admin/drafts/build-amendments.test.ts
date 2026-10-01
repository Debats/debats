import { describe, it, expect } from 'vitest'
import { buildAmendments, AmendFormState } from './build-amendments'
import {
  DraftStatement,
  draftOrganisationAuthor,
  draftPublicFigureAuthor,
} from '../../../domain/entities/draft-statement'
import { DraftResolution } from '../../../domain/use-cases/resolve-draft'

function makeDraft(overrides: Partial<DraftStatement> = {}): DraftStatement {
  return {
    id: 'draft-1',
    author: draftPublicFigureAuthor('Jean-Luc Mélenchon', {
      presentation: 'Homme politique français.',
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/JLM',
    }),
    statementType: 'declaration',
    quote: 'Citation originale du brouillon',
    sourceName: 'Le Monde',
    sourceUrl: 'https://lemonde.fr',
    date: '2024-01-15',
    aiNotes: null,
    subjectTitle: "L'immigration",
    positionTitle: 'Régularisation des sans-papiers',
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
  author: {
    found: true,
    entity: { id: 'pf-1', name: 'Jean-Luc Mélenchon', slug: 'jean-luc-melenchon' },
  },
  subject: { found: true, entity: { id: 'sub-1', title: "L'immigration", slug: 'l-immigration' } },
  position: { found: true, entity: { id: 'pos-1', title: 'Régularisation des sans-papiers' } },
  canValidate: true,
}

const noneFoundResolution: DraftResolution = {
  author: { found: false, canCreate: true },
  subject: { found: false, canCreate: true },
  position: { found: false, canCreate: true },
  canValidate: true,
}

function makeState(overrides: Partial<AmendFormState> = {}): AmendFormState {
  return {
    authorMode: 'existing',
    authorName: 'Jean-Luc Mélenchon',
    authorPresentation: 'Homme politique français.',
    authorWikipedia: 'https://fr.wikipedia.org/wiki/JLM',
    authorNotorietySources: [],
    authorOrganisationType: 'association',
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

  it('should clear creation data when switching to existing with a different name', () => {
    const result = buildAmendments(
      makeDraft(),
      noneFoundResolution,
      makeState({ authorMode: 'existing', authorName: 'Marine Le Pen' }),
    )
    expect(result.author).toEqual({ kind: 'public_figure', name: 'Marine Le Pen', data: null })
  })

  it('should not touch the author when the entity already exists and the name is unchanged', () => {
    const result = buildAmendments(makeDraft(), allFoundResolution, makeState())
    expect(result.author).toBeUndefined()
  })

  it('should clear creation data when switching to existing with same name but entity was not found before', () => {
    const result = buildAmendments(makeDraft(), noneFoundResolution, makeState())
    expect(result.author).toEqual({
      kind: 'public_figure',
      name: 'Jean-Luc Mélenchon',
      data: null,
    })
  })

  it('should include new figure creation data when in new mode with changes', () => {
    const result = buildAmendments(
      makeDraft(),
      noneFoundResolution,
      makeState({ authorMode: 'new', authorPresentation: 'Nouvelle bio.' }),
    )
    expect(result.author).toEqual({
      kind: 'public_figure',
      name: 'Jean-Luc Mélenchon',
      data: {
        presentation: 'Nouvelle bio.',
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/JLM',
      },
    })
  })

  it('should keep the organisation kind and carry over its type when amending', () => {
    const draft = makeDraft({
      author: draftOrganisationAuthor('Renaissance', {
        presentation: 'Parti politique fondé en 2016.',
        organisationType: 'political_party',
      }),
    })
    const result = buildAmendments(
      draft,
      noneFoundResolution,
      makeState({
        authorMode: 'new',
        authorName: 'Renaissance',
        authorPresentation: 'Parti présidentiel.',
        authorWikipedia: '',
        authorOrganisationType: 'political_party',
      }),
    )

    expect(result.author).toEqual({
      kind: 'organisation',
      name: 'Renaissance',
      data: {
        presentation: 'Parti présidentiel.',
        organisationType: 'political_party',
      },
    })
  })

  it('should let the admin correct the organisation type', () => {
    const draft = makeDraft({
      author: draftOrganisationAuthor('Attac France', {
        presentation: 'Mouvement altermondialiste.',
        organisationType: 'political_party',
      }),
    })
    const result = buildAmendments(
      draft,
      noneFoundResolution,
      makeState({
        authorMode: 'new',
        authorName: 'Attac France',
        authorPresentation: 'Mouvement altermondialiste.',
        authorWikipedia: '',
        authorOrganisationType: 'association',
      }),
    )

    expect(result.author).toEqual({
      kind: 'organisation',
      name: 'Attac France',
      data: {
        presentation: 'Mouvement altermondialiste.',
        organisationType: 'association',
      },
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
      author: draftPublicFigureAuthor('Jean-Luc Mélenchon', {
        presentation: 'Bio.',
        notorietySources: [],
      }),
    })
    const result = buildAmendments(
      draft,
      noneFoundResolution,
      makeState({
        authorMode: 'new',
        authorPresentation: 'Bio.',
        authorWikipedia: '',
        authorNotorietySources: ['https://lemonde.fr/article', 'https://liberation.fr/article'],
      }),
    )
    expect(result.author).toEqual({
      kind: 'public_figure',
      name: 'Jean-Luc Mélenchon',
      data: {
        presentation: 'Bio.',
        notorietySources: ['https://lemonde.fr/article', 'https://liberation.fr/article'],
      },
    })
  })

  it('should filter out empty notoriety sources', () => {
    const draft = makeDraft({
      author: draftPublicFigureAuthor('Jean-Luc Mélenchon', {
        presentation: 'Bio.',
        notorietySources: [],
      }),
    })
    const result = buildAmendments(
      draft,
      noneFoundResolution,
      makeState({
        authorMode: 'new',
        authorPresentation: 'Bio.',
        authorWikipedia: '',
        authorNotorietySources: ['https://lemonde.fr/article', '', '  '],
      }),
    )
    expect(result.author).toEqual({
      kind: 'public_figure',
      name: 'Jean-Luc Mélenchon',
      data: {
        presentation: 'Bio.',
        notorietySources: ['https://lemonde.fr/article'],
      },
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
