import { describe, it, expect } from 'vitest'
import { ARGUMENT_STREAM } from '../../domain/aggregates/argument'
import { CONTRIBUTOR_STREAM } from '../../domain/aggregates/contributor'
import { INVITATION_STREAM } from '../../domain/aggregates/invitation'
import { OCCUPATION_FAMILY_STREAM } from '../../domain/aggregates/occupation-family'
import { ORGANISATION_STREAM } from '../../domain/aggregates/organisation'
import { PUBLIC_FIGURE_STREAM } from '../../domain/aggregates/public-figure'
import { STATEMENT_STREAM } from '../../domain/aggregates/statement'
import { SUBJECT_STREAM } from '../../domain/aggregates/subject'
import { THEME_STREAM } from '../../domain/aggregates/theme'
import { projectors } from './projectors'

/** Every aggregate of the domain; a new one is added here when it switches to the journal */
const STREAM_TYPES = [
  STATEMENT_STREAM,
  SUBJECT_STREAM,
  PUBLIC_FIGURE_STREAM,
  ORGANISATION_STREAM,
  ARGUMENT_STREAM,
  THEME_STREAM,
  OCCUPATION_FAMILY_STREAM,
  CONTRIBUTOR_STREAM,
  INVITATION_STREAM,
]

/** Needs no database: a forgotten registration would otherwise die on the first command in production */
describe('projector registry', () => {
  it('holds a projector for every stream type of the domain', () => {
    for (const streamType of STREAM_TYPES) {
      expect(projectors[streamType], `no projector for the ${streamType} stream`).toBeTypeOf(
        'function',
      )
    }
  })

  it('registers nothing the domain does not know', () => {
    expect(Object.keys(projectors).sort()).toEqual([...STREAM_TYPES].sort())
  })
})
