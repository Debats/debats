import { describe, expect, it } from 'vitest'
import { Either } from 'effect'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
import { closeChantierUseCase } from './close-chantier'
import { runWith } from './command-test-helpers'

describe('closeChantierUseCase', () => {
  it('closes the chantier and stops an agent at work', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'working' })])
    const { agent, calls } = fakeAgent()
    const result = await runWith(chantierFakes(chantiers.repository, agent))(
      closeChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) expect(result.right.status).toBe('closed')
    expect(calls.interrupted).toEqual(['sesn_1'])
  })

  it('does not disturb an agent that was already waiting', async () => {
    const chantiers = inMemoryChantiers([aChantier({ status: 'waiting' })])
    const { agent, calls } = fakeAgent()
    await runWith(chantierFakes(chantiers.repository, agent))(
      closeChantierUseCase({ contributor: ADMIN, chantierId: 'chantier-1' }),
    )

    expect(calls.interrupted).toHaveLength(0)
    expect(chantiers.rows.get('chantier-1')?.status).toBe('closed')
  })
})
