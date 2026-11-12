import { Debate, leadOf } from '../../domain/read-models/home-debates'

/**
 * Ce que la barre d'un sujet veut dire, en une phrase : qui mène, et de
 * combien. Rien à dire d'un sujet où personne ne s'est exprimé.
 */
export function leaningNote(debate: Debate): string | undefined {
  const lead = leadOf(debate)
  if (!lead) return undefined
  return lead.tied > 1
    ? `${lead.tied} positions à égalité en tête : ${lead.position.voices} voix chacune, sur ${debate.voices}`
    : `La position la plus soutenue réunit ${lead.position.voices} voix sur ${debate.voices}`
}
