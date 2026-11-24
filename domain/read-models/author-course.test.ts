import { describe, expect, it } from 'vitest'
import { authorCourse, courseTitle } from './author-course'
import { ALL_CONTRADICTORY, compatibilityOf } from './position-judgements'

let recorded = 0
const day = (date: string) => new Date(`${date}T00:00:00Z`)

const stated = (id: string, title: string, date: string) => ({
  position: { id, title },
  statement: { statedAt: day(date), createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, recorded++)) },
})

describe('authorCourse', () => {
  it('says nothing of an author with one position: there is no course to tell', () => {
    const course = authorCourse(
      [
        stated('62', 'Maintien à 62 ans', '2017-03-02'),
        stated('62', 'Maintien à 62 ans', '2019-04-25'),
      ],
      ALL_CONTRADICTORY,
    )

    expect(course.summary).toBeNull()
    expect(Array.from(course.held)).toEqual(['62'])
  })

  it('tells the change of an author who left a position for another, and holds the last only', () => {
    const course = authorCourse(
      [
        stated('62', 'Maintien à 62 ans', '2017-03-02'),
        stated('62', 'Maintien à 62 ans', '2019-04-25'),
        stated('65', 'Report à 65 ans', '2022-03-17'),
      ],
      ALL_CONTRADICTORY,
    )

    expect(course.summary).toEqual({
      kind: 'changed',
      from: { title: 'Maintien à 62 ans', since: day('2017-03-02'), until: day('2019-04-25') },
      to: { title: 'Report à 65 ans', since: day('2022-03-17') },
    })
    expect(Array.from(course.held)).toEqual(['65'])
  })

  it('tells the positions held together by an author who took compatible ones', () => {
    const course = authorCourse(
      [
        stated('ceasefire', 'Appel au cessez-le-feu', '2024-05-31'),
        stated('genocide', 'Qualification de génocide', '2026-02-06'),
      ],
      compatibilityOf([{ positionIds: ['ceasefire', 'genocide'], compatible: true }]),
    )

    expect(course.summary).toEqual({
      kind: 'together',
      positions: [
        { title: 'Appel au cessez-le-feu', since: day('2024-05-31') },
        { title: 'Qualification de génocide', since: day('2026-02-06') },
      ],
    })
    expect(Array.from(course.held)).toEqual(['ceasefire', 'genocide'])
  })

  it('has nothing to tell of an author who said nothing', () => {
    expect(authorCourse([], ALL_CONTRADICTORY)).toEqual({ summary: null, held: new Set() })
  })
})

describe('courseTitle', () => {
  it('names a change, and counts the positions held together', () => {
    const position = { title: 'Une position', since: day('2024-01-01') }
    expect(
      courseTitle({
        kind: 'changed',
        from: { ...position, until: day('2024-02-01') },
        to: position,
      }),
    ).toBe('A changé de position')
    expect(courseTitle({ kind: 'together', positions: [position, position] })).toBe(
      'Défend deux positions',
    )
    expect(courseTitle({ kind: 'together', positions: [position, position, position] })).toBe(
      'Défend 3 positions',
    )
  })
})
