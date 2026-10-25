import { ARGUMENT_STREAM } from '../../domain/aggregates/argument'
import { CONTRIBUTOR_STREAM } from '../../domain/aggregates/contributor'
import { INVITATION_STREAM } from '../../domain/aggregates/invitation'
import { OCCUPATION_FAMILY_STREAM } from '../../domain/aggregates/occupation-family'
import { ORGANISATION_STREAM } from '../../domain/aggregates/organisation'
import { PUBLIC_FIGURE_STREAM } from '../../domain/aggregates/public-figure'
import { STATEMENT_STREAM } from '../../domain/aggregates/statement'
import { SUBJECT_STREAM } from '../../domain/aggregates/subject'
import { THEME_STREAM } from '../../domain/aggregates/theme'
import { projectArgument } from './argument-projector'
import { projectContributor } from './contributor-projector'
import { projectInvitation } from './invitation-projector'
import { projectOccupationFamily } from './occupation-family-projector'
import { projectOrganisation } from './organisation-projector'
import { projectPublicFigure } from './public-figure-projector'
import { projectStatement } from './statement-projector'
import { projectSubject } from './subject-projector'
import { projectTheme } from './theme-projector'
import { ProjectorRegistry } from './projector'

/** The projectors of every stream type; an aggregate registers its own when it switches to the journal */
export const projectors: ProjectorRegistry = {
  [STATEMENT_STREAM]: [projectStatement],
  [SUBJECT_STREAM]: [projectSubject],
  [PUBLIC_FIGURE_STREAM]: [projectPublicFigure],
  [ORGANISATION_STREAM]: [projectOrganisation],
  [ARGUMENT_STREAM]: [projectArgument],
  [THEME_STREAM]: [projectTheme],
  [OCCUPATION_FAMILY_STREAM]: [projectOccupationFamily],
  [CONTRIBUTOR_STREAM]: [projectContributor],
  [INVITATION_STREAM]: [projectInvitation],
}
