import { describe, it, expect } from 'vitest'
import { stanceQuestions, stanceSentence, takenPositions } from './stance-question'

const sixty = { id: 'p-60', title: 'Retraite à 60 ans', statedOn: ['2022-02-05'] }
const sixtyTwo = { id: 'p-62', title: 'Maintien à 62 ans', statedOn: ['2017-03-02', '2019-04-25'] }
const nobodyJudged = () => undefined

describe('takenPositions', () => {
  it('groups what the author said by position, each with its days in order', () => {
    const on = (id: string, title: string, day: string) => ({
      position: { id, title },
      statement: { statedAt: new Date(`${day}T00:00:00Z`) },
    })
    expect(
      takenPositions([
        on('p-62', 'Maintien à 62 ans', '2019-04-25'),
        on('p-60', 'Retraite à 60 ans', '2022-02-05'),
        on('p-62', 'Maintien à 62 ans', '2017-03-02'),
      ]),
    ).toEqual([sixtyTwo, sixty])
  })
})

describe('stanceQuestions', () => {
  it('asks about each position the author took other than the one being recorded', () => {
    expect(
      stanceQuestions([sixty, sixtyTwo], nobodyJudged, { id: 'p-62' }, '2026-11-16').map(
        (q) => q.position.id,
      ),
    ).toEqual(['p-60'])
  })

  it('asks nothing of a pair somebody already judged, compatible or not', () => {
    const judged = (a: string, b: string) => ([a, b].includes('p-60') ? false : undefined)
    expect(stanceQuestions([sixty], judged, { id: 'p-62' }, '2026-11-16')).toEqual([])
  })

  it('asks about every position taken when the one recorded is being created', () => {
    const judged = () => true
    expect(
      stanceQuestions([sixty, sixtyTwo], judged, 'new', '2026-11-16').map((q) => q.position.id),
    ).toEqual(['p-60', 'p-62'])
  })

  it('asks nothing while no position is chosen', () => {
    expect(stanceQuestions([sixty], nobodyJudged, null, '2026-11-16')).toEqual([])
  })

  it('places the position already taken before the new statement, on its last day before it', () => {
    expect(stanceQuestions([sixtyTwo], nobodyJudged, { id: 'p-65' }, '2022-03-17')).toEqual([
      { position: { id: 'p-62', title: 'Maintien à 62 ans' }, timing: 'before', day: '2019-04-25' },
    ])
  })

  it('places it after, on its first day, when the new statement is older than all of it', () => {
    expect(stanceQuestions([sixtyTwo], nobodyJudged, { id: 'p-65' }, '2016-01-01')).toEqual([
      { position: { id: 'p-62', title: 'Maintien à 62 ans' }, timing: 'after', day: '2017-03-02' },
    ])
  })

  it('says the same day when one of its statements is of that day', () => {
    expect(
      stanceQuestions([sixtyTwo], nobodyJudged, { id: 'p-65' }, '2019-04-25')[0],
    ).toMatchObject({ timing: 'same_day', day: '2019-04-25' })
  })

  it('gives its last day, without an order, while the new statement has no date', () => {
    expect(stanceQuestions([sixtyTwo], nobodyJudged, { id: 'p-65' }, '')[0]).toMatchObject({
      timing: 'undated',
      day: '2019-04-25',
    })
  })
})

describe('stanceSentence', () => {
  const question = (timing: 'before' | 'after' | 'same_day' | 'undated') => ({
    position: { id: 'p-60', title: 'Retraite à 60 ans' },
    timing,
    day: '2022-02-05',
  })

  it('says what the author did, in the order the dates give', () => {
    expect(stanceSentence('Marine Le Pen', question('before'))).toEqual({
      lead: 'Marine Le Pen a déjà pris la position ',
      title: '« Retraite à 60 ans »',
      tail: ' le 5 févr. 2022.',
    })
    expect(stanceSentence('Marine Le Pen', question('after'))).toMatchObject({
      lead: 'Marine Le Pen a pris plus tard la position ',
      tail: ', le 5 févr. 2022.',
    })
    expect(stanceSentence('Rima Hassan', question('same_day'))).toMatchObject({
      lead: 'Rima Hassan a pris le même jour la position ',
      tail: '.',
    })
    expect(stanceSentence('Marine Le Pen', question('undated'))).toMatchObject({
      lead: 'Marine Le Pen a aussi pris la position ',
      tail: ', le 5 févr. 2022.',
    })
  })
})
