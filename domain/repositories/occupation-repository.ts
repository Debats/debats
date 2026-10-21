import { Context, Effect } from 'effect'
import { Occupation } from '../entities/occupation'
import { OccupationAssignmentInput, OccupationHeld } from '../read-models/occupations'
import { OccupationAssignment } from '../services/occupation-distribution'
import { DatabaseError } from './errors'

/**
 * Reads the occupations projection. Writes go through the journal: the list
 * itself by the family stream (domain/aggregates/occupation-family.ts), the
 * links by the public figure stream (domain/aggregates/public-figure.ts).
 */
export interface OccupationRepository {
  /** Every occupation, by name */
  findAll(): Effect.Effect<Occupation[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Occupation | null, DatabaseError>

  findById(id: string): Effect.Effect<Occupation | null, DatabaseError>

  findByIds(ids: string[]): Effect.Effect<Occupation[], DatabaseError>

  /** The occupations of one family, by name */
  findByFamilyId(familyId: string): Effect.Effect<Occupation[], DatabaseError>

  /** The occupations a public figure holds or held, by name */
  findByPublicFigureId(publicFigureId: string): Effect.Effect<OccupationHeld[], DatabaseError>

  /** Every (figure, occupation) link of one family, for its page */
  findAssignmentsByFamilyId(familyId: string): Effect.Effect<OccupationAssignment[], DatabaseError>

  /** The occupations these figures hold today, to name their role in a list */
  findCurrentHeldByPublicFigureIds(
    publicFigureIds: string[],
  ): Effect.Effect<Array<{ publicFigureId: string; occupation: Occupation }>, DatabaseError>

  /** Every (figure, occupation) link of the site, for the counters */
  findAllAssignments(): Effect.Effect<OccupationAssignment[], DatabaseError>

  /** The (figure, occupation) links of these figures */
  findAssignmentsByPublicFigureIds(
    publicFigureIds: string[],
  ): Effect.Effect<OccupationAssignment[], DatabaseError>
}

export const OccupationRepository = Context.GenericTag<OccupationRepository>('OccupationRepository')
