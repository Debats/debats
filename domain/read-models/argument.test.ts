import { describe, it, expect } from 'vitest'
import { argumentsByPosition, isPolarisingArgument, SubjectArgumentSummary } from './argument'

const summary = (
  id: string,
  title: string,
  positions: Array<{ id: string; statementsCount: number }>,
): SubjectArgumentSummary => ({
  id,
  title,
  description: 'Description.',
  statementsCount: positions.reduce((sum, p) => sum + p.statementsCount, 0),
  positions: positions.map((p) => ({ ...p, title: p.id, slug: p.id })),
  totalAuthorsCount: 0,
  authors: [],
})

describe('arguments read model', () => {
  it('calls polarising an argument mobilised by more than one position', () => {
    expect(isPolarisingArgument(summary('a', 'A', [{ id: 'pour', statementsCount: 2 }]))).toBe(
      false,
    )
    expect(
      isPolarisingArgument(
        summary('a', 'A', [
          { id: 'pour', statementsCount: 2 },
          { id: 'contre', statementsCount: 1 },
        ]),
      ),
    ).toBe(true)
  })

  it('indexes the arguments under each position they are mobilised for', () => {
    const byPosition = argumentsByPosition([
      summary('a', 'Dignité', [
        { id: 'pour', statementsCount: 2 },
        { id: 'contre', statementsCount: 1 },
      ]),
      summary('b', 'Liberté', [{ id: 'pour', statementsCount: 1 }]),
    ])

    expect(byPosition.get('pour')).toEqual([
      { id: 'a', title: 'Dignité' },
      { id: 'b', title: 'Liberté' },
    ])
    expect(byPosition.get('contre')).toEqual([{ id: 'a', title: 'Dignité' }])
    expect(byPosition.get('autre')).toBeUndefined()
  })
})
