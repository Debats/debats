import { Context, Effect } from 'effect'
import { OccupationFamily } from '../entities/occupation-family'
import { DatabaseError } from './errors'

/** Reads the families projection; writes go through the journal (domain/aggregates/occupation-family.ts) */
export interface OccupationFamilyRepository {
  /** Every family, in display order */
  findAll(): Effect.Effect<OccupationFamily[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<OccupationFamily | null, DatabaseError>

  findById(id: string): Effect.Effect<OccupationFamily | null, DatabaseError>
}

export const OccupationFamilyRepository = Context.GenericTag<OccupationFamilyRepository>(
  'OccupationFamilyRepository',
)
