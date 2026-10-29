import { Effect, Either, Layer } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { UnitOfWork } from '../domain/events/unit-of-work'
import { WikipediaValidator } from '../domain/services/wikipedia-validator'
import { ArgumentRepository } from '../domain/repositories/argument-repository'
import { ContributorRepository } from '../domain/repositories/contributor-repository'
import { DraftStatementRepository } from '../domain/repositories/draft-statement-repository'
import { InvitationRepository } from '../domain/repositories/invitation-repository'
import { OccupationFamilyRepository } from '../domain/repositories/occupation-family-repository'
import { OccupationRepository } from '../domain/repositories/occupation-repository'
import { OrganisationMembershipRepository } from '../domain/repositories/organisation-membership-repository'
import { OrganisationRepository } from '../domain/repositories/organisation-repository'
import { PositionRepository } from '../domain/repositories/position-repository'
import { PublicFigureRepository } from '../domain/repositories/public-figure-repository'
import { ReputationRepository } from '../domain/repositories/reputation-repository'
import { StatementRepository } from '../domain/repositories/statement-repository'
import { SubjectRepository } from '../domain/repositories/subject-repository'
import { ThemeRepository } from '../domain/repositories/theme-repository'
import { ArgumentSource } from '../domain/use-cases/argument-stream'
import { InvitationSource } from '../domain/use-cases/invitation-stream'
import { OccupationFamilySource } from '../domain/use-cases/occupation-family-stream'
import { OrganisationSource } from '../domain/use-cases/organisation-stream'
import { PublicFigureSource } from '../domain/use-cases/public-figure-stream'
import { StatementSource } from '../domain/use-cases/statement-stream'
import { SubjectSource } from '../domain/use-cases/subject-stream'
import { ThemeSource } from '../domain/use-cases/theme-stream'
import {
  CommandFailure,
  FormFailure,
  runCommand,
  runFormCommand,
} from '../domain/use-cases/run-command'
import { FieldErrors } from '../domain/use-cases/types'
import { createArgumentRepository } from './database/argument-repository-supabase'
import { createContributorRepository } from './database/contributor-repository-supabase'
import { createDraftStatementRepository } from './database/draft-statement-repository-supabase'
import { createInvitationRepository } from './database/invitation-repository-supabase'
import { createOccupationFamilyRepository } from './database/occupation-family-repository-supabase'
import { createOccupationRepository } from './database/occupation-repository-supabase'
import { createOrganisationMembershipRepository } from './database/organisation-membership-repository-supabase'
import { createOrganisationRepository } from './database/organisation-repository-supabase'
import { createPositionRepository } from './database/position-repository-supabase'
import { createPublicFigureRepository } from './database/public-figure-repository-supabase'
import { createReputationRepository } from './database/reputation-repository-supabase'
import { createStatementRepository } from './database/statement-repository-supabase'
import { createSubjectRepository } from './database/subject-repository-supabase'
import { createThemeRepository } from './database/theme-repository-supabase'
import {
  createArgumentSource,
  createInvitationSource,
  createOccupationFamilySource,
  createOrganisationSource,
  createPublicFigureSource,
  createStatementSource,
  createSubjectSource,
  createThemeSource,
} from './events/sources'
import { runUnitOfWork as runInPostgres } from './events/unit-of-work'
import { createAdminSupabaseClient } from './supabase/admin'
import { createWikipediaValidator } from './wikipedia/wikipedia-validator'

/**
 * Every service a command may ask for, as the site runs them: the journal in
 * a Postgres transaction with its projections, the read side through
 * Supabase, Wikipedia over the network. A command declares what it needs in
 * its type; this layer answers for all of them.
 */
export function liveServices(supabase: SupabaseClient<Database> = createAdminSupabaseClient()) {
  return Layer.mergeAll(
    Layer.succeed(UnitOfWork, (work) => runInPostgres(work)),
    Layer.succeed(WikipediaValidator, createWikipediaValidator()),
    Layer.succeed(ArgumentRepository, createArgumentRepository(supabase)),
    Layer.succeed(ContributorRepository, createContributorRepository(supabase)),
    Layer.succeed(DraftStatementRepository, createDraftStatementRepository(supabase)),
    Layer.succeed(InvitationRepository, createInvitationRepository(supabase)),
    Layer.succeed(OccupationFamilyRepository, createOccupationFamilyRepository(supabase)),
    Layer.succeed(OccupationRepository, createOccupationRepository(supabase)),
    Layer.succeed(
      OrganisationMembershipRepository,
      createOrganisationMembershipRepository(supabase),
    ),
    Layer.succeed(OrganisationRepository, createOrganisationRepository(supabase)),
    Layer.succeed(PositionRepository, createPositionRepository(supabase)),
    Layer.succeed(PublicFigureRepository, createPublicFigureRepository(supabase)),
    Layer.succeed(ReputationRepository, createReputationRepository(supabase)),
    Layer.succeed(StatementRepository, createStatementRepository(supabase)),
    Layer.succeed(SubjectRepository, createSubjectRepository(supabase)),
    Layer.succeed(ThemeRepository, createThemeRepository(supabase)),
    Layer.succeed(ArgumentSource, createArgumentSource(supabase)),
    Layer.succeed(InvitationSource, createInvitationSource(supabase)),
    Layer.succeed(OccupationFamilySource, createOccupationFamilySource(supabase)),
    Layer.succeed(OrganisationSource, createOrganisationSource(supabase)),
    Layer.succeed(PublicFigureSource, createPublicFigureSource(supabase)),
    Layer.succeed(StatementSource, createStatementSource(supabase)),
    Layer.succeed(SubjectSource, createSubjectSource(supabase)),
    Layer.succeed(ThemeSource, createThemeSource(supabase)),
  )
}

/** The services the live layer provides */
export type LiveServices = Layer.Layer.Success<ReturnType<typeof liveServices>>

/** Runs a command against the live services and tells the contributor what came of it */
export function runLive<A>(
  command: Effect.Effect<A, CommandFailure, LiveServices>,
  supabase?: SupabaseClient<Database>,
): Promise<Either.Either<A, string>> {
  return runCommand(Effect.provide(command, liveServices(supabase)))
}

/** The same, for a command behind a form: a field at fault is named */
export function runLiveForm<A>(
  command: Effect.Effect<A, FormFailure, LiveServices>,
  supabase?: SupabaseClient<Database>,
): Promise<Either.Either<A, string | FieldErrors>> {
  return runFormCommand(Effect.provide(command, liveServices(supabase)))
}
