import { describe, it, expect } from 'vitest'
import { StatementWithDetails } from '../repositories/statement-repository'
import { statementsOnTheme } from './statements-on-theme'

const on = (subjectId: string) =>
  ({ subject: { id: subjectId } }) as unknown as StatementWithDetails

describe('statementsOnTheme', () => {
  it('keeps the statements whose subject carries the theme', () => {
    const kept = statementsOnTheme([on('s-1'), on('s-2'), on('s-3')], ['s-1', 's-3'])
    expect(kept.map((s) => s.subject.id)).toEqual(['s-1', 's-3'])
  })

  it('keeps nothing when no subject carries the theme', () => {
    expect(statementsOnTheme([on('s-1')], [])).toEqual([])
  })
})
