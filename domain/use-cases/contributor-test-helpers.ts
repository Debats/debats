import { StoredEvent } from '../events/event-store'

type Journal = { all(): StoredEvent[] }

/** The grants a journal holds, as `[contributorId, action, amount]`, in order */
export const grantsIn = (journal: Journal): Array<[string, string, number]> =>
  journal
    .all()
    .filter((e) => e.type === 'ReputationGranted')
    .map((e) => {
      const payload = e.payload as { action: string; amount: number }
      return [e.streamId, payload.action, payload.amount]
    })

/** What a journal holds besides the grants: the deeds themselves */
export const deedsIn = (journal: Journal): StoredEvent[] =>
  journal.all().filter((e) => e.streamType !== 'contributor')
