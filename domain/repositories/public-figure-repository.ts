import { Context, Effect } from "effect"
import { PublicFigure } from "../entities/public-figure"
import { PublicFigureStats } from "../value-objects/public-figure-stats"

export class DatabaseError extends Error {
  readonly _tag = "DatabaseError"
}

export interface PublicFigureRepository {
  findAll(): Effect.Effect<PublicFigure[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<PublicFigure | null, DatabaseError>

  findById(id: string): Effect.Effect<PublicFigure | null, DatabaseError>

  create(publicFigure: PublicFigure): Effect.Effect<PublicFigure, DatabaseError>

  update(publicFigure: PublicFigure): Effect.Effect<PublicFigure, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  getStats(publicFigureId: string): Effect.Effect<PublicFigureStats, DatabaseError>
}

export const PublicFigureRepository = Context.GenericTag<PublicFigureRepository>("PublicFigureRepository")

