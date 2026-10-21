import { Effect } from 'effect'
import { ARGUMENT_STREAM } from '../../domain/aggregates/argument'
import { CONTRIBUTOR_STREAM } from '../../domain/aggregates/contributor'
import { OCCUPATION_FAMILY_STREAM } from '../../domain/aggregates/occupation-family'
import { ORGANISATION_STREAM } from '../../domain/aggregates/organisation'
import { PUBLIC_FIGURE_STREAM } from '../../domain/aggregates/public-figure'
import { STATEMENT_STREAM } from '../../domain/aggregates/statement'
import { SUBJECT_STREAM } from '../../domain/aggregates/subject'
import { THEME_STREAM } from '../../domain/aggregates/theme'
import { StoredEvent } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { PrismaTransaction } from '../prisma/client'
import { projectArgument } from './argument-projector'
import { projectContributor } from './contributor-projector'
import { projectOccupationFamily } from './occupation-family-projector'
import { projectOrganisation } from './organisation-projector'
import { projectPublicFigure } from './public-figure-projector'
import { projectStatement } from './statement-projector'
import { projectSubject } from './subject-projector'
import { projectTheme } from './theme-projector'

/**
 * Keeps one table in step with the events of one stream type. A projector
 * reads only the event, is idempotent, and runs in the transaction that
 * appended the event. Replaying the journal through it rebuilds the table.
 */
export type Projector = (
  event: StoredEvent,
  tx: PrismaTransaction,
) => Effect.Effect<void, DatabaseError>

/** Projectors by stream type; an aggregate registers its own when it switches to the journal */
export type ProjectorRegistry = Readonly<Record<string, readonly Projector[]>>

export const projectors: ProjectorRegistry = {
  [STATEMENT_STREAM]: [projectStatement],
  [SUBJECT_STREAM]: [projectSubject],
  [PUBLIC_FIGURE_STREAM]: [projectPublicFigure],
  [ORGANISATION_STREAM]: [projectOrganisation],
  [ARGUMENT_STREAM]: [projectArgument],
  [THEME_STREAM]: [projectTheme],
  [OCCUPATION_FAMILY_STREAM]: [projectOccupationFamily],
  [CONTRIBUTOR_STREAM]: [projectContributor],
}
