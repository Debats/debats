import { DebateLead } from '../../domain/read-models/home-debates'

/** Ce que la barre d'un sujet veut dire, en une phrase : qui mène, et de combien. */
export const leaningNote = (lead: DebateLead, voices: number): string =>
  lead.tied > 1
    ? `${lead.tied} positions à égalité en tête : ${lead.position.voices} voix chacune, sur ${voices}`
    : `La position la plus soutenue réunit ${lead.position.voices} voix sur ${voices}`
