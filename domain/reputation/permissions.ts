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

/**
 * La réputation qu'un rang demande. Zéro pour les deux premiers : on est
 * Métèque dès l'inscription, et Sophiste sans rien demander.
 */
export function rankThreshold(rank: Rank): number {
  return rank === Rank.Sophiste || rank === Rank.Meteque ? 0 : RANK_THRESHOLDS[rank]
}

export function getNextRankThreshold(reputation: number): number | null {
  if (reputation < 0) return 0
  if (reputation < RANK_THRESHOLDS[Rank.Eloquent]) return RANK_THRESHOLDS[Rank.Eloquent]
  if (reputation < RANK_THRESHOLDS[Rank.Idealiste]) return RANK_THRESHOLDS[Rank.Idealiste]
  if (reputation < RANK_THRESHOLDS[Rank.Fondateur]) return RANK_THRESHOLDS[Rank.Fondateur]
  return null
}

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
  add_position: Rank.Sophiste,

  // Métèque (0+) : relire ce que d'autres ont ajouté
  confirm_entity: Rank.Meteque,
  flag_entity: Rank.Meteque,

  // Éloquent (1000+)
  assign_theme: Rank.Eloquent,
  assign_occupation: Rank.Eloquent,
  link_subjects: Rank.Eloquent,
  add_argument: Rank.Eloquent,
  add_subject: Rank.Eloquent,
  add_personality: Rank.Eloquent,
  add_organisation: Rank.Eloquent,
  add_membership: Rank.Eloquent,
  invite_user: Rank.Eloquent,

  // Idéaliste (10000+)
  add_theme: Rank.Idealiste,
  edit_theme: Rank.Idealiste,
  delete_theme: Rank.Idealiste,
  add_occupation: Rank.Idealiste,
  edit_occupation: Rank.Idealiste,
  delete_occupation: Rank.Idealiste,
  delete_minor_subject: Rank.Idealiste,
  delete_minor_personality: Rank.Idealiste,
  delete_argument: Rank.Idealiste,
  delete_position: Rank.Idealiste,
  edit_argument: Rank.Idealiste,
  edit_subject: Rank.Idealiste,
  edit_personality: Rank.Idealiste,
  edit_organisation: Rank.Idealiste,
  remove_membership: Rank.Idealiste,
  edit_statement: Rank.Idealiste,
  edit_position: Rank.Idealiste,
  settle_flag: Rank.Idealiste,

  // Fondateur (1000000+)
  delete_major_subject: Rank.Fondateur,
  delete_major_personality: Rank.Fondateur,
  admin: Rank.Fondateur,
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
  added_organisation_validated: 50,
  added_membership: 5,
  edited_subject: 5,
  edited_statement: 5,
  edited_personality: 5,
  edited_organisation: 5,
  edited_position: 5,
  added_statement_validated: 50,
  added_argument_validated: 50,
  added_position_validated: 50,
  linked_argument_to_statement: 1,

  // Relecture : confirmer ce qu'on a vérifié, signaler ce qui ne va pas
  confirmed_entity: 1,
  flag_upheld: 50,

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
