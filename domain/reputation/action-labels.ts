import { type RewardableAction } from './permissions'

const ACTION_LABELS: Record<RewardableAction, string> = {
  // Inscription
  signed_up: 'Inscription',

  // Création de contenu
  added_subject: 'Ajout d’un sujet',
  added_subject_validated: 'Sujet validé',
  added_personality_validated: 'Personnalité validée',
  added_organisation_validated: 'Organisation validée',
  added_membership: 'Affiliation d’une personnalité',
  edited_subject: 'Modification d’un sujet',
  edited_statement: 'Modification d’une prise de position',
  edited_personality: 'Modification d’une personnalité',
  edited_organisation: 'Modification d’une organisation',
  edited_position: 'Modification d’une position',
  added_statement_validated: 'Prise de position validée',
  added_argument_validated: 'Argument validé',
  added_position_validated: 'Position validée',
  linked_argument_to_statement: 'Argument lié à une prise de position',

  // Relecture
  confirmed_entity: 'Confirmation d’un contenu',
  flag_upheld: 'Signalement fondé',

  // Invitations
  invitation_bonus: 'Bonus d’invitation',
  invitation_accepted: 'Invitation acceptée',

  // Spéciaux
  founder: 'Fondateur',
  early_bird: 'Early bird',
  blogged_about: 'Article de blog',
}

const isOnTheScale = (action: string): action is RewardableAction => action in ACTION_LABELS

/** An action the scale no longer names is shown as the history recorded it */
export function actionLabel(action: string): string {
  return isOnTheScale(action) ? ACTION_LABELS[action] : action
}
