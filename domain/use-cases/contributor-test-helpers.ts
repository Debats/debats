import { StoredEvent } from '../events/event-store'

type Journal = { all(): StoredEvent[] }

/** A contributor's stream holds what her deeds earned her, and nothing else */
const rewarding = (event: StoredEvent) => event.streamType === 'contributor'

/** The grant facts a journal holds, as the store wrote them */
export const grantFactsIn = (journal: Journal): StoredEvent[] => journal.all().filter(rewarding)

/** The grants a journal holds, as `[contributorId, action, amount]`, in order */
export const grantsIn = (journal: Journal): Array<[string, string, number]> =>
  grantFactsIn(journal).map((e) => {
    const payload = e.payload as { action: string; amount: number }
    return [e.streamId, payload.action, payload.amount]
  })

/** What a journal holds besides the grants: the deeds themselves */
export const deedsIn = (journal: Journal): StoredEvent[] =>
  journal.all().filter((event) => !rewarding(event))
