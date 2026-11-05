import { StatedSpan, StatementWithAuthor } from '../repositories/statement-repository'
import { SubjectAlignment } from '../services/group-alignment'

/**
 * Ce que la page « un auteur sur un sujet » lit autour de ses propres
 * prises de position. L'infrastructure produit ces formes, la présentation
 * les consomme : ni l'une ni l'autre ne dépend de l'autre.
 */

/** Un sujet voisin, et ce que l'auteur y défend quand il s'y est exprimé */
export interface NeighbourSubject {
  title: string
  slug: string
  /** Les positions que l'auteur y défend, vide s'il ne s'est pas exprimé */
  positions: string[]
  statements: number
}

/** La carte de visite de l'auteur, pour le rail */
export interface AuthorProfile {
  /** Ses métiers actuels, pour la ligne de rôle */
  occupations: string[]
  /** Ses affiliations en cours */
  organisations: Array<{ name: string; slug: string; acronym: string | null }>
  subjects: number
  statements: number
}

export interface AuthorSubjectPage {
  /** Toutes les prises de position du sujet, tous auteurs confondus */
  everyone: StatementWithAuthor[]
  /** Les positions ouvertes sur le sujet, celles que personne n'a prises comprises */
  positions: Array<{ id: string; title: string; slug: string }>
  /** La période couverte par les prises de position du sujet */
  span: StatedSpan | null
  /** Le métier actuel de chaque personnalité du sujet, pour la nommer sous son nom */
  roles: Map<string, string>
  alignment: SubjectAlignment
  neighbours: NeighbourSubject[]
  profile: AuthorProfile
}
