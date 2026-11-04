import { describe, expect, it } from 'vitest'
import { publicFigureAuthor, voteContent } from '../entities/statement'
import {
  createPosition,
  createPublicFigure,
  createStatement,
  createSubject,
} from '../entities/entity-test-helpers'
import { publicFigureRef } from './statement-author'
import { statementCorrectionView } from './statement-correction'

describe('statementCorrectionView', () => {
  it('tells the statement as the edit form holds it: author, subject, position, content, source, day and arguments', () => {
    const subject = createSubject({
      title: 'La réforme des retraites',
      presentation: 'Le report de l’âge légal.',
      problem: 'À quel âge partir ?',
      createdBy: 'founder',
    })
    const position = createPosition({
      title: 'Report à 64 ans',
      description: 'Porter l’âge légal à 64 ans.',
      subjectId: subject.id,
      createdBy: 'founder',
    })
    const figure = createPublicFigure({
      name: 'Élisabeth Borne',
      presentation: 'Première ministre de 2022 à 2024.',
      createdBy: 'founder',
    })
    const statement = createStatement({
      author: publicFigureAuthor(figure.id),
      positionId: position.id,
      content: voteContent('Projet de loi de financement rectificative', 'pour'),
      sourceName: 'Assemblée nationale',
      sourceUrl: 'https://www.assemblee-nationale.fr/dyn/16/scrutins/1',
      statedAt: new Date('2023-03-16T23:00:00Z'),
    })

    const view = statementCorrectionView(statement, publicFigureRef(figure), subject, position, [
      { id: 'arg-1', title: 'Équilibre des comptes' },
    ])

    expect(view).toEqual({
      id: statement.id,
      author: { kind: 'public_figure', slug: 'elisabeth-borne', name: 'Élisabeth Borne' },
      subject: { slug: 'la-reforme-des-retraites', title: 'La réforme des retraites' },
      position: { slug: 'report-a-64-ans', title: 'Report à 64 ans' },
      content: {
        kind: 'vote',
        votedText: 'Projet de loi de financement rectificative',
        choice: 'pour',
      },
      sourceName: 'Assemblée nationale',
      sourceUrl: 'https://www.assemblee-nationale.fr/dyn/16/scrutins/1',
      statedAt: '2023-03-16',
      arguments: [{ id: 'arg-1', title: 'Équilibre des comptes' }],
    })
  })
})
