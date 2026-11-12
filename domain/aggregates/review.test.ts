import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { Rejected } from './decision'
import {
  ALREADY_FLAGGED,
  ANSWER_REQUIRED,
  confirm,
  confirmationsReset,
  confirmationWithdrawn,
  confirmed,
  correct,
  earnsConfirmation,
  emptyReview,
  flag,
  flagged,
  flaggers,
  flagsSettled,
  flagWithdrawn,
  NOTHING_TO_SETTLE,
  OWN_CONTRIBUTION,
  replayReview,
  settle,
  withdrawConfirmation,
  withdrawFlag,
} from './review'

const entityId = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const at = (index: number) => new Date(`2026-11-${10 + index}T10:00:00Z`)

type Fact = { type: string; payload: unknown }
const by = (actorId: string | null, event: Fact) => ({ actorId, event })

const stored = ({ actorId, event }: ReturnType<typeof by>, index: number): StoredEvent => ({
  ...event,
  streamType: 'review',
  streamId: entityId,
  revision: index + 1,
  actorId,
  metadata: {},
  occurredAt: at(index),
})

const rebuilt = (...history: Array<ReturnType<typeof by>>) => {
  const state = replayReview(history.map(stored))
  if (Either.isLeft(state)) throw new Error('expected a state')
  return state.right
}

const deadLink = {
  flagId: 'flag-1',
  reason: 'source_mismatch' as const,
  comment: 'Le lien renvoie vers une page supprimée.',
}
const camilleFlagged = by('camille', flagged('statement', deadLink))
const nadiaConfirmed = by('nadia', confirmed('statement'))

describe('confirming', () => {
  it('records the confirmation of a reader who is not the author', () => {
    expect(confirm('statement', 'nadia', 'lea')(emptyReview)).toEqual(
      Either.right([confirmed('statement')]),
    )
  })

  it('is refused to the one who added the entity', () => {
    expect(confirm('statement', 'lea', 'lea')(emptyReview)).toEqual(
      Either.left(new Rejected(OWN_CONTRIBUTION)),
    )
  })

  it('says nothing twice', () => {
    expect(confirm('statement', 'nadia', 'lea')(rebuilt(nadiaConfirmed))).toEqual(Either.right([]))
  })

  it('withdraws the flag the same reader had raised: one cannot do both', () => {
    expect(confirm('statement', 'camille', 'lea')(rebuilt(camilleFlagged))).toEqual(
      Either.right([flagWithdrawn('flag-1'), confirmed('statement')]),
    )
  })

  it('is withdrawn by the one who gave it, and only when given', () => {
    expect(withdrawConfirmation('nadia')(rebuilt(nadiaConfirmed))).toEqual(
      Either.right([confirmationWithdrawn()]),
    )
    expect(withdrawConfirmation('sacha')(rebuilt(nadiaConfirmed))).toEqual(Either.right([]))
  })
})

describe('what a confirmation earns', () => {
  it('is earned the first time, not by confirming again after a withdrawal', () => {
    expect(earnsConfirmation(emptyReview, 'nadia')).toBe(true)
    expect(
      earnsConfirmation(rebuilt(nadiaConfirmed, by('nadia', confirmationWithdrawn())), 'nadia'),
    ).toBe(false)
  })

  it('is earned again once a correction reset the confirmations: it is a new reading', () => {
    expect(
      earnsConfirmation(rebuilt(nadiaConfirmed, by('jalil', confirmationsReset())), 'nadia'),
    ).toBe(true)
  })
})

describe('flagging', () => {
  it('records the flag with its reason and comment', () => {
    expect(flag('statement', 'camille', 'lea', deadLink)(emptyReview)).toEqual(
      Either.right([flagged('statement', deadLink)]),
    )
  })

  it('is refused to the one who added the entity', () => {
    expect(flag('statement', 'lea', 'lea', deadLink)(emptyReview)).toEqual(
      Either.left(new Rejected(OWN_CONTRIBUTION)),
    )
  })

  it('is refused to a reader whose flag is still open', () => {
    expect(flag('statement', 'camille', 'lea', deadLink)(rebuilt(camilleFlagged))).toEqual(
      Either.left(new Rejected(ALREADY_FLAGGED)),
    )
  })

  it('withdraws the confirmation the same reader had given', () => {
    expect(flag('statement', 'nadia', 'lea', deadLink)(rebuilt(nadiaConfirmed))).toEqual(
      Either.right([confirmationWithdrawn(), flagged('statement', deadLink)]),
    )
  })

  it('is withdrawn by the one who raised it', () => {
    expect(withdrawFlag('camille')(rebuilt(camilleFlagged))).toEqual(
      Either.right([flagWithdrawn('flag-1')]),
    )
    expect(withdrawFlag('nadia')(rebuilt(camilleFlagged))).toEqual(Either.right([]))
  })
})

describe('settling', () => {
  it('closes every open flag with the outcome and the answer', () => {
    expect(settle('dismissed', 'La source dit bien cela.')(rebuilt(camilleFlagged))).toEqual(
      Either.right([flagsSettled('dismissed', 'La source dit bien cela.')]),
    )
  })

  it('is refused when no flag is open', () => {
    expect(settle('dismissed', 'Rien à dire.')(emptyReview)).toEqual(
      Either.left(new Rejected(NOTHING_TO_SETTLE)),
    )
  })

  it('is answered for, whether the flags are dismissed or the entity removed', () => {
    const open = rebuilt(camilleFlagged)
    expect(settle('dismissed', '  ')(open)).toEqual(
      Either.left(new Rejected(ANSWER_REQUIRED, 'answer')),
    )
    expect(settle('removed', '')(open)).toEqual(
      Either.left(new Rejected(ANSWER_REQUIRED, 'answer')),
    )
  })

  it('names the readers whose flags it closes, for what they earn', () => {
    const sachaFlagged = by('sacha', flagged('statement', { ...deadLink, flagId: 'flag-2' }))
    expect(flaggers(rebuilt(camilleFlagged, sachaFlagged))).toEqual(['camille', 'sacha'])
    expect(
      flaggers(rebuilt(camilleFlagged, by('jalil', flagsSettled('corrected', undefined)))),
    ).toEqual([])
  })
})

describe('correcting', () => {
  const reviewed = () => rebuilt(nadiaConfirmed, camilleFlagged)

  it('closes the open flags as corrected when the edit answers them, with or without a word', () => {
    expect(
      correct({ settlesFlags: true, answer: 'Lien remplacé.', resetConfirmations: false })(
        reviewed(),
      ),
    ).toEqual([flagsSettled('corrected', 'Lien remplacé.')])
    expect(correct({ settlesFlags: true, resetConfirmations: false })(reviewed())).toEqual([
      flagsSettled('corrected', undefined),
    ])
  })

  it('leaves the flags open when the edit was made for another reason', () => {
    expect(correct({ settlesFlags: false, resetConfirmations: false })(reviewed())).toEqual([])
  })

  it('resets the confirmations when the one who corrects says so, and only then', () => {
    expect(correct({ settlesFlags: false, resetConfirmations: true })(reviewed())).toEqual([
      confirmationsReset(),
    ])
  })

  it('has nothing to say of an entity nobody confirmed or flagged', () => {
    expect(correct({ settlesFlags: true, resetConfirmations: true })(emptyReview)).toEqual([])
  })
})

describe('replayReview', () => {
  it('rebuilds who confirmed and which flags are open', () => {
    expect(rebuilt(nadiaConfirmed, camilleFlagged)).toEqual({
      confirmedBy: ['nadia'],
      rewardedConfirmers: ['nadia'],
      openFlags: [{ id: 'flag-1', by: 'camille' }],
    })
  })

  it('forgets the confirmations a correction reset, and the flags a settlement closed', () => {
    expect(
      rebuilt(
        nadiaConfirmed,
        camilleFlagged,
        by('jalil', flagsSettled('corrected', undefined)),
        by('jalil', confirmationsReset()),
      ),
    ).toEqual(emptyReview)
  })

  it('refuses a confirmation nobody signed: the journal is corrupt', () => {
    const state = replayReview([stored(by(null, confirmed('statement')), 0)])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
