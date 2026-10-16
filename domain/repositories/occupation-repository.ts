import { Context, Effect } from 'effect'
import { Occupation } from '../entities/occupation'
import { OccupationAssignment } from '../services/occupation-distribution'
import { DatabaseError } from './errors'

export interface OccupationRepository {
  /** Every occupation, by name */
  findAll(): Effect.Effect<Occupation[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Occupation | null, DatabaseError>

  findById(id: string): Effect.Effect<Occupation | null, DatabaseError>

  findByIds(ids: string[]): Effect.Effect<Occupation[], DatabaseError>

  create(occupation: Occupation): Effect.Effect<Occupation, DatabaseError>

  update(occupation: Occupation): Effect.Effect<Occupation, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  /** The occupations a public figure holds, by name */
  findByPublicFigureId(publicFigureId: string): Effect.Effect<Occupation[], DatabaseError>

  /** Every public figure holding an occupation */
  findPublicFigureIdsByOccupationId(occupationId: string): Effect.Effect<string[], DatabaseError>

  /** Every (figure, occupation) link of the site, for the counters */
  findAllAssignments(): Effect.Effect<OccupationAssignment[], DatabaseError>

  /** The (figure, occupation) links of these figures */
  findAssignmentsByPublicFigureIds(
    publicFigureIds: string[],
  ): Effect.Effect<OccupationAssignment[], DatabaseError>

  /** Replaces the set of occupations a public figure holds */
  setAssignments(
    publicFigureId: string,
    occupationIds: string[],
    createdBy: string,
  ): Effect.Effect<void, DatabaseError>
}

export const OccupationRepository = Context.GenericTag<OccupationRepository>('OccupationRepository')
