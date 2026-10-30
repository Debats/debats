import { describe, it, expect } from 'vitest'
import { createStatement } from './entity-test-helpers'
import {
  actContent,
  declarationContent,
  organisationAuthor,
  programContent,
  publicFigureAuthor,
  quoteOf,
  statementTypeOf,
  voteContent,
} from './statement'

const base = {
  positionId: 'pos-1',
  sourceName: 'Le Monde',
  sourceUrl: 'https://www.lemonde.fr/article',
  statedAt: new Date('2024-01-15'),
  createdBy: 'user-1',
  author: publicFigureAuthor('figure-1'),
}

const QUOTE = 'Une citation suffisamment longue pour être valide.'

describe('StatementAuthor', () => {
  it('names a public figure', () => {
    expect(publicFigureAuthor('figure-1')).toEqual({ kind: 'public_figure', id: 'figure-1' })
  })

  it('names an organisation', () => {
    expect(organisationAuthor('org-1')).toEqual({ kind: 'organisation', id: 'org-1' })
  })

  it('is refused by the statement schema for an unknown kind', () => {
    expect(() =>
      createStatement({
        ...base,
        author: { kind: 'robot', id: 'x' } as never,
        content: declarationContent(QUOTE),
      }),
    ).toThrow()
  })

  it('needs a source to be checkable', () => {
    expect(() =>
      createStatement({ ...base, sourceUrl: '', content: declarationContent(QUOTE) }),
    ).toThrow()
  })
})

describe('what a statement carries, by type', () => {
  it('a declaration carries the words themselves', () => {
    const statement = createStatement({ ...base, content: declarationContent(QUOTE) })

    expect(statementTypeOf(statement.content)).toBe('declaration')
    expect(quoteOf(statement.content)).toBe(QUOTE)
  })

  it('a declaration without words is refused', () => {
    expect(() => declarationContent('court')).toThrow()
  })

  it('a programme names its document besides quoting it', () => {
    const content = programContent("L'Avenir en commun", QUOTE)

    expect(statementTypeOf(content)).toBe('program')
    expect(content).toMatchObject({ document: "L'Avenir en commun", quote: QUOTE })
  })

  it('a programme without a document is refused', () => {
    expect(() => programContent('', QUOTE)).toThrow()
  })

  it('a vote names the text and the way it went, and quotes nothing', () => {
    const content = voteContent('Proposition de loi sur la fin de vie', 'contre')

    expect(statementTypeOf(content)).toBe('vote')
    expect(content).toMatchObject({
      votedText: 'Proposition de loi sur la fin de vie',
      choice: 'contre',
    })
    expect(quoteOf(content)).toBeUndefined()
  })

  it('a vote refuses a choice that says nothing', () => {
    expect(() => voteContent('Proposition de loi', 'non-votant' as never)).toThrow()
  })

  it('a vote without a text put to the ballot is refused', () => {
    expect(() => voteContent('', 'pour')).toThrow()
  })

  it('an act says what was done, and quotes nothing', () => {
    const content = actContent('Cosignature de la proposition de loi n° 575')

    expect(statementTypeOf(content)).toBe('act')
    expect(content).toMatchObject({ deed: 'Cosignature de la proposition de loi n° 575' })
    expect(quoteOf(content)).toBeUndefined()
  })

  it('an act refuses a deed too long to read at a glance', () => {
    expect(() => actContent('x'.repeat(151))).toThrow()
  })

  it('an act without a deed is refused', () => {
    expect(() => actContent('')).toThrow()
  })
})
