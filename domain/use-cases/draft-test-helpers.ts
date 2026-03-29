import { Option } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'
import { Subject, SubjectId, SubjectSlug, SubjectTitle } from '../entities/subject'
import { Position, PositionId, PositionSlug, PositionTitle } from '../entities/position'

export function makeDraft(overrides: Partial<DraftStatement> = {}): DraftStatement {
  return {
    id: 'draft-1',
    quote: 'Une citation importante sur le sujet',
    sourceName: 'Le Monde',
    sourceUrl: 'https://lemonde.fr/article',
    date: '2024-01-15',
    aiNotes: null,
    publicFigureName: 'Jean-Luc Mélenchon',
    subjectTitle: "L'immigration",
    positionTitle: 'Régularisation des sans-papiers',
    publicFigureData: {
      presentation: 'Homme politique français, leader de LFI.',
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean-Luc_M%C3%A9lenchon',
    },
    subjectData: {
      presentation: "L'immigration est un sujet central du débat public.",
      problem: 'Quelle politique migratoire adopter ?',
    },
    positionData: {
      description: 'Régulariser les travailleurs sans-papiers présents sur le territoire.',
    },
    origin: 'test',
    status: 'pending',
    rejectionNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function makePublicFigure(): PublicFigure {
  return PublicFigure.make({
    id: PublicFigureId.make('pf-1'),
    name: PublicFigureName.make('Jean-Luc Mélenchon'),
    slug: PublicFigureSlug.make('jean-luc-melenchon'),
    presentation: 'Homme politique français.',
    wikipediaUrl: Option.none(),
    notorietySources: [],
    websiteUrl: Option.none(),
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

export function makeSubject(): Subject {
  return Subject.make({
    id: SubjectId.make('sub-1'),
    title: SubjectTitle.make("L'immigration"),
    slug: SubjectSlug.make('l-immigration'),
    presentation: "L'immigration est un sujet central.",
    problem: 'Quelle politique migratoire adopter ?',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

export function makePosition(): Position {
  return Position.make({
    id: PositionId.make('pos-1'),
    title: PositionTitle.make('Régularisation des sans-papiers'),
    slug: PositionSlug.make('regularisation-des-sans-papiers'),
    description: 'Régulariser les travailleurs sans-papiers.',
    subjectId: 'sub-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}
