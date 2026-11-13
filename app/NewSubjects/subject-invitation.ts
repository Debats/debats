import { Debate } from '../../domain/read-models/home-debates'
import { plural } from '../../lib/plural'

export interface SubjectInvitation {
  /** Où en est le sujet */
  standing: string
  /** Ce que le lien propose d'y faire */
  call: string
}

/**
 * Un sujet neuf a par définition peu de voix : plutôt que de montrer comment
 * elles se répartissent, l'accueil dit combien il en compte et invite à y
 * ajouter une prise de position — la première, ou une de plus.
 */
export function subjectInvitation({ voices }: Pick<Debate, 'voices'>): SubjectInvitation {
  if (voices === 0) return { standing: 'Aucune voix recensée', call: 'Ajouter la première' }

  return {
    standing: `${voices} voix ${plural(voices, 'recensée', 'recensées')}`,
    call: 'Compléter',
  }
}
