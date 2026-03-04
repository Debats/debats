export enum Rank {
  Sophiste = 'Sophiste', // Score négatif
  Meteque = 'Métèque', // Nouvel arrivant (0+)
  Eloquent = 'Éloquent', // Confirmé (1000+)
  Idealiste = 'Idéaliste', // Modérateur (10000+)
  Fondateur = 'Fondateur', // (1000000+)
}

const RANK_THRESHOLDS = {
  [Rank.Eloquent]: 1000,
  [Rank.Idealiste]: 10000,
  [Rank.Fondateur]: 1000000,
} as const

export function getRank(reputation: number): Rank {
  if (reputation < 0) return Rank.Sophiste
  if (reputation >= RANK_THRESHOLDS[Rank.Fondateur]) return Rank.Fondateur
  if (reputation >= RANK_THRESHOLDS[Rank.Idealiste]) return Rank.Idealiste
  if (reputation >= RANK_THRESHOLDS[Rank.Eloquent]) return Rank.Eloquent
  return Rank.Meteque
}

// Actions et permissions
const ACTIONS = {
  // Sophiste et Métèque (tous les utilisateurs authentifiés)
  add_statement: Rank.Sophiste,
  add_evidence: Rank.Sophiste,
  add_position: Rank.Sophiste,

  // Éloquent (1000+)
  add_argument: Rank.Eloquent,
  add_subject: Rank.Eloquent,
  add_personality: Rank.Eloquent,
  invite_user: Rank.Eloquent,
  approve_subject: Rank.Eloquent,
  approve_personality: Rank.Eloquent,
  approve_evidence: Rank.Eloquent,
  approve_argument: Rank.Eloquent,
  approve_position: Rank.Eloquent,
  reject_subject: Rank.Eloquent,
  reject_personality: Rank.Eloquent,
  reject_evidence: Rank.Eloquent,
  reject_argument: Rank.Eloquent,
  reject_position: Rank.Eloquent,

  // Idéaliste (10000+)
  delete_minor_subject: Rank.Idealiste,
  delete_minor_personality: Rank.Idealiste,
  delete_evidence: Rank.Idealiste,
  delete_argument: Rank.Idealiste,
  delete_position: Rank.Idealiste,
  edit_argument: Rank.Idealiste,
  edit_subject: Rank.Idealiste,
  edit_personality: Rank.Idealiste,

  // Fondateur (1000000+)
  delete_major_subject: Rank.Fondateur,
  delete_major_personality: Rank.Fondateur,
} as const

export type Action = keyof typeof ACTIONS

const RANK_ORDER: Rank[] = [
  Rank.Sophiste,
  Rank.Meteque,
  Rank.Eloquent,
  Rank.Idealiste,
  Rank.Fondateur,
]

export function requiredRank(action: Action): Rank {
  return ACTIONS[action]
}

export function canPerform(reputation: number, action: Action): boolean {
  const userRank = getRank(reputation)
  return RANK_ORDER.indexOf(userRank) >= RANK_ORDER.indexOf(requiredRank(action))
}

// Barème de points
const REWARDS = {
  // Inscription
  signed_up: 5,

  // Création de contenu
  added_subject: 50,
  added_subject_validated: 200,
  added_personality_validated: 50,
  edited_subject: 5,
  added_statement_validated: 50,
  added_evidence_validated: 50,
  added_argument_validated: 50,
  added_position_validated: 50,
  linked_argument_to_statement: 1,

  // Validation
  validated_subject: 50,
  validated_personality: 50,
  validated_statement: 50,
  validated_argument: 50,
  validated_position: 50,

  // Rejections
  subject_rejected_spam: -1000,
  subject_rejected_duplicate: -100,
  subject_rejected_off_topic: -100,
  personality_rejected_spam: -1000,
  personality_rejected_duplicate: -100,
  personality_rejected_off_topic: -100,
  statement_rejected: -100,
  evidence_rejected: -100,
  argument_rejected: -100,
  position_rejected: -100,
  argument_to_statement_link_rejected: -100,

  // Invitations
  invitation_bonus: 0, // variable: floor(inviterReputation / 2)
  invitation_accepted: 50,

  // Spéciaux
  founder: 1000000,
  early_bird: 10000,
  blogged_about: 1000,
} as const

export type RewardableAction = keyof typeof REWARDS

export function reputationReward(action: RewardableAction): number {
  return REWARDS[action]
}
