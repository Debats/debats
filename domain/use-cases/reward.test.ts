import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { createInMemoryEventStore } from '../events/event-store-memory'
import { grantEach, rewardFor } from './reward'

describe('grantEach', () => {
  it('appends one contributor’s grants together, after what the stream already holds', async () => {
    const journal = createInMemoryEventStore()
    await Effect.runPromise(grantEach(journal, 'alice', [rewardFor('alice', 'added_subject')]))

    await Effect.runPromise(
      grantEach(journal, 'alice', [
        rewardFor('alice', 'added_statement_validated', {
          relatedEntityType: 'statement',
          relatedEntityId: 's-1',
        }),
        rewardFor('alice', 'linked_argument_to_statement'),
        rewardFor('bob', 'invitation_accepted'),
      ]),
    )

    expect(
      journal
        .all()
        .map((e) => [e.streamId, e.revision, e.actorId, (e.payload as { amount: number }).amount]),
    ).toEqual([
      ['alice', 1, 'alice', 50],
      ['alice', 2, 'alice', 50],
      ['alice', 3, 'alice', 1],
      ['bob', 1, 'alice', 50],
    ])
    expect(journal.all()[1].payload).toMatchObject({
      action: 'added_statement_validated',
      relatedEntityType: 'statement',
      relatedEntityId: 's-1',
    })
  })
})
