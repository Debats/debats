import { describe, expect, it } from 'vitest'
import { ConcurrencyError, UniqueTaken, UnreadableEvent } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { Invalid, NotFound, Rejected } from '../../domain/use-cases/types'
import { httpFailureOf } from './command-outcome'

describe('httpFailureOf', () => {
  it('answers 404 to what the command could not find', () => {
    expect(httpFailureOf(new NotFound('Cette organisation est introuvable.'))).toEqual({
      status: 404,
      body: { error: 'Cette organisation est introuvable.' },
    })
  })

  it('answers 400 to a refusal, naming the field when the command did', () => {
    expect(httpFailureOf(new Rejected('Le rôle est trop long.', 'role'))).toEqual({
      status: 400,
      body: { error: 'Le rôle est trop long.', field: 'role' },
    })
    expect(httpFailureOf(new Rejected('Un des métiers choisis n’existe plus.'))).toEqual({
      status: 400,
      body: { error: 'Un des métiers choisis n’existe plus.' },
    })
  })

  it('answers 400 to a form with several fields at fault, field by field', () => {
    expect(httpFailureOf(new Invalid({ name: 'Requis.', presentation: 'Trop court.' }))).toEqual({
      status: 400,
      body: { error: 'Invalid fields', fields: { name: 'Requis.', presentation: 'Trop court.' } },
    })
  })

  it('answers 409 when the value was taken or the stream edited meanwhile', () => {
    expect(httpFailureOf(new UniqueTaken('organisations_slug_key')).status).toBe(409)
    expect(
      httpFailureOf(new ConcurrencyError({ streamType: 'organisation', streamId: 'o-1' }, 2))
        .status,
    ).toBe(409)
  })

  it('answers 500 to what is not the caller’s doing', () => {
    const event = {
      id: 'ev-1',
      type: 'Unknown',
      payload: {},
      streamType: 'organisation',
      streamId: 'o-1',
      revision: 1,
    }
    expect(httpFailureOf(new DatabaseError('boom')).status).toBe(500)
    expect(httpFailureOf(new UnreadableEvent(event as never, 'bad')).status).toBe(500)
  })
})
