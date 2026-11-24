import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
import { POSITION_GONE, SAME_POSITION } from '../aggregates/subject'
import { runWith } from './command-test-helpers'
import { judgePositionsUseCase } from './judge-positions'
import { journalWithSubjects, samplePosition, sampleSubject } from './subject-test-helpers'

const gaza = sampleSubject('L’offensive israélienne à Gaza')
const genocide = samplePosition(gaza.id, 'Qualification de génocide')
const sanctions = samplePosition(gaza.id, 'Sanctions contre Israël')

const idealiste = { id: 'abc', reputation: 10000 }
const params = {
  subjectId: gaza.id,
  positionIds: [genocide.id, sanctions.id] as const,
  compatible: true,
  contributor: idealiste,
}

const execute = runWith(Layer.empty)
const seeded = () => journalWithSubjects([gaza, [genocide, sanctions]])

describe('judgePositionsUseCase', () => {
  it('asks to be signed in', async () => {
    const result = await execute(judgePositionsUseCase({ ...params, contributor: null }))
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('is refused below the rank that judges positions', async () => {
    const result = await execute(
      judgePositionsUseCase({ ...params, contributor: { id: 'abc', reputation: 1000 } }),
    )
    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('records the verdict on the subject, the pair named once', async () => {
    const { run, journal } = await seeded()
    const [first, second] = [genocide.id, sanctions.id].sort()

    const result = await execute(
      judgePositionsUseCase({ ...params, positionIds: [second, first] }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all().at(-1)).toMatchObject({
      streamId: gaza.id,
      type: 'PositionsJudged',
      payload: { positionIds: [first, second], compatible: true },
      actorId: idealiste.id,
    })
  })

  it('writes nothing when the verdict already stands', async () => {
    const { run, journal } = await seeded()
    await execute(judgePositionsUseCase(params), run)
    const written = journal.all().length

    const again = await execute(judgePositionsUseCase(params), run)

    expect(Either.isRight(again)).toBe(true)
    expect(journal.all()).toHaveLength(written)
  })

  it('refuses a position the subject does not have, or one judged against itself', async () => {
    const { run } = await seeded()
    expect(
      await execute(
        judgePositionsUseCase({ ...params, positionIds: [genocide.id, 'missing'] }),
        run,
      ),
    ).toEqual(Either.left(POSITION_GONE))
    expect(
      await execute(
        judgePositionsUseCase({ ...params, positionIds: [genocide.id, genocide.id] }),
        run,
      ),
    ).toEqual(Either.left(SAME_POSITION))
  })
})
