import { Revision, StreamRef } from '../../domain/events/event-store'
import { getPrismaClient } from '../prisma/client'

/**
 * The revision a stream stands at, for a page to tell its form which state
 * it edits: the command then refuses to overwrite what someone else wrote
 * meanwhile. Zero for a stream the journal does not hold yet.
 */
export async function currentRevision(stream: StreamRef): Promise<Revision> {
  const last = await getPrismaClient().domain_events.aggregate({
    where: { stream_type: stream.streamType, stream_id: stream.streamId },
    _max: { revision: true },
  })
  return last._max.revision ?? 0
}
