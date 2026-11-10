import { Effect, pipe } from 'effect'
import { Chantier, isOpen } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { found } from './preconditions'
import { Rejected } from './types'

export const CHANTIER_NOT_FOUND = 'Ce chantier n’existe pas.'
export const CHANTIER_CLOSED = 'Ce chantier est clos : ouvrez-en un autre.'
export const NO_SESSION = 'Ce chantier n’a pas de session : l’agent n’a pas pu être lancé.'

const chantiers = Effect.serviceFunctions(ChantierRepository)

/** The chantier the command names, or a refusal that says it does not exist */
export const chantierFound = (id: string) =>
  Effect.flatMap(chantiers.findById(id), found(CHANTIER_NOT_FOUND))

/** The chantier, still open to messages */
export const chantierOpen = (id: string) =>
  pipe(
    chantierFound(id),
    Effect.filterOrFail(isOpen, () => new Rejected(CHANTIER_CLOSED)),
  )

/** The session a chantier runs in: an open chantier without one was never started */
export const sessionOf = (chantier: Chantier): Effect.Effect<string, Rejected> =>
  found(NO_SESSION)(chantier.sessionId)
