import { describe, expect, it } from 'vitest'
import { fromStatementContent, toStatementContent } from './statement-content-columns'
import {
  actContent,
  declarationContent,
  programContent,
  voteContent,
} from '../../domain/entities/statement'

const QUOTE = 'Une citation suffisamment longue pour être valide.'

describe('statement content, between the union and the columns', () => {
  it('writes a declaration and reads it back', () => {
    const columns = fromStatementContent(declarationContent(QUOTE))

    expect(columns).toEqual({
      statement_type: 'declaration',
      quote: QUOTE,
      document_name: null,
      voted_text: null,
      vote_choice: null,
      deed: null,
    })
    expect(toStatementContent(columns)).toEqual(declarationContent(QUOTE))
  })

  it('writes a programme and reads it back', () => {
    const content = programContent("L'Avenir en commun", QUOTE)

    expect(toStatementContent(fromStatementContent(content))).toEqual(content)
  })

  it('writes a vote and reads it back, with no quote at all', () => {
    const content = voteContent('Proposition de loi sur la fin de vie', 'contre')
    const columns = fromStatementContent(content)

    expect(columns.quote).toBeNull()
    expect(columns.voted_text).toBe('Proposition de loi sur la fin de vie')
    expect(toStatementContent(columns)).toEqual(content)
  })

  it('writes an act and reads it back', () => {
    const content = actContent('Cosignature de la proposition de loi n° 575')
    const columns = fromStatementContent(content)

    expect(columns.quote).toBeNull()
    expect(toStatementContent(columns)).toEqual(content)
  })

  it('clears the columns of the other variants', () => {
    expect(fromStatementContent(actContent('Dépôt d’un recours'))).toMatchObject({
      quote: null,
      document_name: null,
      voted_text: null,
      vote_choice: null,
    })
  })

  it('refuses a row whose columns contradict its type', () => {
    expect(() =>
      toStatementContent({
        statement_type: 'vote',
        quote: QUOTE,
        document_name: null,
        voted_text: null,
        vote_choice: null,
        deed: null,
      }),
    ).toThrow('no voted_text')
  })

  it('refuses a declaration with no words', () => {
    expect(() =>
      toStatementContent({
        statement_type: 'declaration',
        quote: null,
        document_name: null,
        voted_text: null,
        vote_choice: null,
        deed: null,
      }),
    ).toThrow('no quote')
  })
})
