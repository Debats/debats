import { describe, expect, it } from 'vitest'
import { latestChanges, StatedPosition } from './position-changes'

const figure = (name: string) => ({ id: name, name, slug: name.toLowerCase() })
const subject = (title: string) => ({ id: title, title, slug: title.toLowerCase() })

let recorded = 0

/** One statement of a figure on a subject, recorded after the ones stated before it in the test */
const stated = (
  who: string,
  on: string,
  position: string,
  day: string,
  recordedAt?: string,
): StatedPosition => ({
  figure: figure(who),
  subject: subject(on),
  position: { id: `${on}-${position}`, title: position },
  statedAt: new Date(`${day}T00:00:00Z`),
  createdAt: new Date(recordedAt ?? Date.UTC(2026, 0, 1, 0, 0, recorded++)),
})

describe('latestChanges', () => {
  it('tells the position a figure left and the one she took, with the day of each', () => {
    const [change, ...others] = latestChanges(
      [
        stated('Ada', 'Retraite', '62 ans', '2017-04-01'),
        stated('Ada', 'Retraite', '62 ans', '2019-08-26'),
        stated('Ada', 'Retraite', '65 ans', '2022-03-17'),
      ],
      5,
    )

    expect(others).toEqual([])
    expect(change.figure.name).toBe('Ada')
    expect(change.subject.title).toBe('Retraite')
    expect(change.from).toEqual({ title: '62 ans', statedAt: new Date('2019-08-26T00:00:00Z') })
    expect(change.to).toEqual({ title: '65 ans', statedAt: new Date('2022-03-17T00:00:00Z') })
  })

  it('reads the statements in the order they were stated, whatever order they come in', () => {
    const [change] = latestChanges(
      [
        stated('Ada', 'Retraite', '65 ans', '2022-03-17'),
        stated('Ada', 'Retraite', '62 ans', '2017-04-01'),
      ],
      5,
    )

    expect([change.from.title, change.to.title]).toEqual(['62 ans', '65 ans'])
  })

  it('sees no change in two positions stated the same day: nothing tells which came first', () => {
    const changes = latestChanges(
      [
        stated('Ada', 'Lycées', 'Dotations', '2026-10-12'),
        stated('Ada', 'Lycées', 'Canicules', '2026-10-12'),
      ],
      5,
    )

    expect(changes).toEqual([])
  })

  it('sees no change in a figure who keeps saying the same thing', () => {
    const changes = latestChanges(
      [
        stated('Ada', 'Retraite', '62 ans', '2017-04-01'),
        stated('Ada', 'Retraite', '62 ans', '2019-08-26'),
      ],
      5,
    )

    expect(changes).toEqual([])
  })

  it('shows the last move of a figure who moved more than once, a return included', () => {
    const [change] = latestChanges(
      [
        stated('Ada', 'Retraite', '62 ans', '2017-04-01'),
        stated('Ada', 'Retraite', '65 ans', '2022-03-17'),
        stated('Ada', 'Retraite', '62 ans', '2025-01-10'),
      ],
      5,
    )

    expect([change.from.title, change.to.title]).toEqual(['65 ans', '62 ans'])
  })

  it('keeps each figure and each subject apart', () => {
    const changes = latestChanges(
      [
        stated('Ada', 'Retraite', '62 ans', '2017-04-01'),
        stated('Bob', 'Retraite', '65 ans', '2022-03-17'),
        stated('Ada', 'Nucléaire', 'Sortie', '2023-01-01'),
      ],
      5,
    )

    expect(changes).toEqual([])
  })

  it('lists the latest changes first, up to the limit', () => {
    const changes = latestChanges(
      [
        stated('Ada', 'Retraite', '62 ans', '2017-04-01'),
        stated('Ada', 'Retraite', '65 ans', '2022-03-17'),
        stated('Bob', 'Nucléaire', 'Sortie', '2012-01-01'),
        stated('Bob', 'Nucléaire', 'Relance', '2024-06-01'),
        stated('Cleo', 'SMIC', 'Gel', '2010-01-01'),
        stated('Cleo', 'SMIC', 'Hausse', '2011-01-01'),
      ],
      2,
    )

    expect(changes.map((change) => change.figure.name)).toEqual(['Bob', 'Ada'])
  })
})
