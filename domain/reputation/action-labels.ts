import { type RewardableAction } from './permissions'

const ACTION_LABELS: Record<RewardableAction, string> = {
  // Inscription
  signed_up: 'Inscription',

  // Création de contenu
  added_subject: 'Ajout d\u2019un sujet',
  added_subject_validated: 'Sujet validé',
  added_personality_validated: 'Personnalité validée',
  edited_subject: 'Modification d\u2019un sujet',
  edited_statement: 'Modification d\u2019une prise de position',
  edited_personality: 'Modification d\u2019une personnalité',
  edited_position: 'Modification d\u2019une position',
  added_statement_validated: 'Prise de position validée',
  added_argument_validated: 'Argument validé',
  added_position_validated: 'Position validée',
  linked_argument_to_statement: 'Argument lié à une prise de position',

  // Validation
  validated_subject: 'Validation d\u2019un sujet',
  validated_personality: 'Validation d\u2019une personnalité',
  validated_statement: 'Validation d\u2019une prise de position',
  validated_argument: 'Validation d\u2019un argument',
  validated_position: 'Validation d\u2019une position',

  // Rejets
  subject_rejected_spam: 'Sujet rejeté (spam)',
  subject_rejected_duplicate: 'Sujet rejeté (doublon)',
  subject_rejected_off_topic: 'Sujet rejeté (hors-sujet)',
  personality_rejected_spam: 'Personnalité rejetée (spam)',
  personality_rejected_duplicate: 'Personnalité rejetée (doublon)',
  personality_rejected_off_topic: 'Personnalité rejetée (hors-sujet)',
  statement_rejected: 'Prise de position rejetée',
  argument_rejected: 'Argument rejeté',
  position_rejected: 'Position rejetée',
  argument_to_statement_link_rejected: 'Lien argument-position rejeté',

  // Invitations
  invitation_bonus: 'Bonus d\u2019invitation',
  invitation_accepted: 'Invitation acceptée',

  // Spéciaux
  founder: 'Fondateur',
  early_bird: 'Early bird',
  blogged_about: 'Article de blog',
}

export function actionLabel(action: RewardableAction): string {
  return ACTION_LABELS[action]
}
