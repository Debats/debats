import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { organisationAuthor, publicFigureAuthor } from '../entities/statement'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import {
  addSignatory,
  ALREADY_SIGNATORY,
  disengageFrom,
  followMergedPosition,
  jointDeclarationPublished,
  NO_POSITION_TAKEN,
  positionTaken,
  publishJointDeclaration,
  replayJointDeclaration,
  signatoryAdded,
  signatureOf,
  SUBJECT_ALREADY_ENGAGED,
  subjectDisengaged,
  takenPositionMerged,
  takePosition,
} from './joint-declaration'

const streamId = '1f2e3d4c-5b6a-4798-8a9b-0c1d2e3f4a5b'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'alice',
): StoredEvent => ({
  ...event,
  streamType: 'joint_declaration',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const manifesto = {
  title: 'Le Manifeste de Paris',
  presentation: "  Contre l'oligarchie internationale ",
  sourceName: 'Manifeste de Paris',
  sourceUrl: 'https://parismanifesto.world',
  declaredAt: new Date('2026-11-21'),
}

const onMedia = {
  subjectId: 'subject-media',
  positionId: 'position-media',
  quote: 'un renforcement de l’indépendance des médias',
}
const onAi = {
  subjectId: 'subject-ai',
  positionId: 'position-ai',
  quote: 'un nouveau modèle de propriété des sociétés d’intelligence artificielle',
}

const published = jointDeclarationPublished(manifesto)
const zucman = publicFigureAuthor('figure-zucman')
const attac = organisationAuthor('organisation-attac')

const stateOf = (...events: { type: string; payload: unknown }[]) => {
  const state = replayJointDeclaration(
    events.map((event, index) => stored(event, index + 1, at('2026-11-21'))),
  )
  if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
  return state.right
}

describe('joint declaration facts', () => {
  it('derive the slug from the title, and keep the day the text was published', () => {
    expect(published.payload).toEqual({
      title: 'Le Manifeste de Paris',
      slug: 'le-manifeste-de-paris',
      presentation: "Contre l'oligarchie internationale",
      sourceName: 'Manifeste de Paris',
      sourceUrl: 'https://parismanifesto.world',
      declaredAt: '2026-11-21',
    })
  })

  it('leave out a presentation that holds nothing', () => {
    const bare = jointDeclarationPublished({ ...manifesto, presentation: '   ' })
    expect(bare.payload).not.toHaveProperty('presentation')
  })
})

describe('publishing a joint declaration', () => {
  it('opens the stream with the text and each position it takes', () => {
    expect(publishJointDeclaration(manifesto, [onMedia, onAi])).toEqual(
      Either.right([published, positionTaken(onMedia), positionTaken(onAi)]),
    )
  })

  it('refuses a text that takes no position: signing it would say nothing', () => {
    const refusal = publishJointDeclaration(manifesto, [])
    expect(Either.isLeft(refusal) && refusal.left.message).toBe(NO_POSITION_TAKEN)
  })

  it('refuses two positions on the same subject', () => {
    const refusal = publishJointDeclaration(manifesto, [
      onMedia,
      { ...onMedia, positionId: 'another-position-on-media' },
    ])
    expect(Either.isLeft(refusal) && refusal.left.message).toBe(SUBJECT_ALREADY_ENGAGED)
  })
})

describe('taking one more position', () => {
  it('records the position on a subject the text was silent on', () => {
    const state = stateOf(published, positionTaken(onMedia))
    expect(takePosition(onAi)(state)).toEqual(Either.right([positionTaken(onAi)]))
  })

  it('refuses a second position on a subject the text already engages', () => {
    const state = stateOf(published, positionTaken(onMedia))
    const refusal = takePosition({ ...onMedia, positionId: 'another-position-on-media' })(state)
    expect(Either.isLeft(refusal) && refusal.left.message).toBe(SUBJECT_ALREADY_ENGAGED)
  })
})

describe('adding a signatory', () => {
  it('records the signature of a personality or of an organisation', () => {
    const state = stateOf(published, positionTaken(onMedia), signatoryAdded(zucman))
    expect(addSignatory(attac)(state)).toEqual(Either.right([signatoryAdded(attac)]))
  })

  it('refuses who has already signed', () => {
    const state = stateOf(published, positionTaken(onMedia), signatoryAdded(zucman))
    const refusal = addSignatory(zucman)(state)
    expect(Either.isLeft(refusal) && refusal.left.message).toBe(ALREADY_SIGNATORY)
  })

  it('tells a personality from an organisation that bears the same id', () => {
    const state = stateOf(published, positionTaken(onMedia), signatoryAdded(zucman))
    expect(Either.isRight(addSignatory(organisationAuthor(zucman.id))(state))).toBe(true)
  })
})

describe('adding a signatory to a text that no longer takes any position', () => {
  it('refuses: the signature would make no statement', () => {
    const state = stateOf(published, positionTaken(onMedia), subjectDisengaged('subject-media'))
    const refusal = addSignatory(zucman)(state)
    expect(Either.isLeft(refusal) && refusal.left.message).toBe(NO_POSITION_TAKEN)
  })
})

describe('what happens to the text when a position leaves the site', () => {
  const state = stateOf(published, positionTaken(onMedia), positionTaken(onAi))

  it('follows the position it takes when it is merged into another', () => {
    expect(followMergedPosition('position-media', 'position-media-merged')(state)).toEqual([
      takenPositionMerged('position-media', 'position-media-merged'),
    ])
  })

  it('has nothing to say of the merge of a position it does not take', () => {
    expect(followMergedPosition('another-position', 'position-media-merged')(state)).toEqual([])
  })

  it('stops engaging a subject that is deleted', () => {
    expect(disengageFrom('subject-ai')(state)).toEqual([subjectDisengaged('subject-ai')])
  })

  it('has nothing to say of the deletion of a subject it does not engage', () => {
    expect(disengageFrom('another-subject')(state)).toEqual([])
  })

  it('takes the position that remains, on the same subject and in the same words', () => {
    const merged = stateOf(
      published,
      positionTaken(onMedia),
      positionTaken(onAi),
      takenPositionMerged('position-media', 'position-media-merged'),
    )
    expect(merged.positions).toEqual([{ ...onMedia, positionId: 'position-media-merged' }, onAi])
  })

  it('keeps the positions it takes on the subjects that remain', () => {
    const disengaged = stateOf(
      published,
      positionTaken(onMedia),
      positionTaken(onAi),
      subjectDisengaged('subject-media'),
    )
    expect(disengaged.positions).toEqual([onAi])
  })
})

describe('the statement a signature makes', () => {
  it('says what the text says on a subject, in the name of the signatory', () => {
    const state = stateOf(published, positionTaken(onMedia))
    expect(signatureOf(state, zucman, onMedia)).toEqual({
      author: zucman,
      subjectId: 'subject-media',
      positionId: 'position-media',
      content: { kind: 'declaration', quote: 'un renforcement de l’indépendance des médias' },
      sourceName: 'Manifeste de Paris',
      sourceUrl: 'https://parismanifesto.world',
      statedAt: new Date('2026-11-21'),
      argumentIds: [],
      jointDeclarationId: streamId,
    })
  })
})

describe('replayJointDeclaration', () => {
  it('rebuilds nothing from an empty stream', () => {
    expect(replayJointDeclaration([])).toEqual(Either.right(null))
  })

  it('rebuilds the text, the positions it takes and who signed it, in order', () => {
    const state = replayJointDeclaration([
      stored(published, 1, at('2026-11-21')),
      stored(positionTaken(onMedia), 2, at('2026-11-21')),
      stored(signatoryAdded(zucman), 3, at('2026-11-22')),
      stored(positionTaken(onAi), 4, at('2026-11-23')),
      stored(signatoryAdded(attac), 5, at('2026-11-24'), 'bob'),
    ])
    expect(Either.isRight(state) && state.right).toEqual({
      declaration: {
        id: streamId,
        title: 'Le Manifeste de Paris',
        slug: 'le-manifeste-de-paris',
        presentation: "Contre l'oligarchie internationale",
        sourceName: 'Manifeste de Paris',
        sourceUrl: 'https://parismanifesto.world',
        declaredAt: new Date('2026-11-21'),
        createdBy: 'alice',
        updatedBy: 'bob',
        createdAt: at('2026-11-21'),
        updatedAt: at('2026-11-24'),
      },
      positions: [onMedia, onAi],
      signatories: [zucman, attac],
    })
  })

  it('refuses an event it cannot read', () => {
    const state = replayJointDeclaration([
      stored({ type: 'JointDeclarationPublished', payload: { title: 1 } }, 1, at('2026-11-21')),
    ])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })

  it('refuses a stream that does not open with a publication: the journal is corrupt', () => {
    const state = replayJointDeclaration([stored(signatoryAdded(zucman), 1, at('2026-11-21'))])
    expect(Either.isLeft(state) && state.left?.message).toContain('not a creation')
  })

  it('refuses a publication without an author: a joint declaration always has one', () => {
    const state = replayJointDeclaration([stored(published, 1, at('2026-11-21'), null)])
    expect(Either.isLeft(state) && state.left?.message).toContain('needs an author')
  })
})
