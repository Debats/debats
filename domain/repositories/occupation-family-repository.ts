import { Context, Effect } from 'effect'
import { OccupationFamily } from '../entities/occupation-family'
import { DatabaseError } from './errors'

export interface OccupationFamilyRepository {
  /** Every family, in display order */
  findAll(): Effect.Effect<OccupationFamily[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<OccupationFamily | null, DatabaseError>

  findById(id: string): Effect.Effect<OccupationFamily | null, DatabaseError>

  create(family: OccupationFamily): Effect.Effect<OccupationFamily, DatabaseError>

  /** Removes the family and, with it, its occupations */
  delete(id: string): Effect.Effect<void, DatabaseError>
}

export const OccupationFamilyRepository = Context.GenericTag<OccupationFamilyRepository>(
  'OccupationFamilyRepository',
)
