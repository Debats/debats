import { Revision, StreamRef } from '../../domain/events/event-store'
import { getPrismaClient } from '../prisma/client'

/**
 * The revision a stream stands at, for a page to tell its form which state
 * it edits: the command then refuses to overwrite what someone else wrote
 * meanwhile. Every aggregate has a stream, since its creation or since the
 * backfill of its table: an empty one is a defect of the data, not a state
 * a page can render from.
 */
export async function currentRevision(stream: StreamRef): Promise<Revision> {
  const last = await getPrismaClient().domain_events.aggregate({
    where: { stream_type: stream.streamType, stream_id: stream.streamId },
    _max: { revision: true },
  })
  if (last._max.revision === null) {
    throw new Error(
      `The ${stream.streamType} stream ${stream.streamId} is empty: every aggregate has a stream`,
    )
  }
  return last._max.revision
}
