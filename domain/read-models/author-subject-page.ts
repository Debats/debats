import { StatedSpan, StatementWithAuthor } from '../repositories/statement-repository'
import { SubjectAlignment } from '../services/group-alignment'

/**
 * Ce que les pages « un auteur sur un sujet » lisent autour des prises de
 * position de leur auteur. L'infrastructure produit ces formes, la
 * présentation les consomme : ni l'une ni l'autre ne dépend de l'autre.
 *
 * Il y a deux pages, et non une page configurable : une personnalité se
 * présente par ses métiers et ses affiliations, une organisation par ses
 * membres. Ce qu'elles ont en commun est `SubjectContext` ; chacune le
 * complète de ce qu'elle seule sait montrer.
 */

/** Un sujet voisin, et ce que l'auteur y défend quand il s'y est exprimé */
export interface NeighbourSubject {
  title: string
  slug: string
  /** Les positions que l'auteur y défend, vide s'il ne s'est pas exprimé */
  positions: string[]
  statements: number
}

/** Une affiliation en cours, telle que la page la nomme */
export interface Affiliation {
  name: string
  slug: string
  acronym: string | null
}

/** Le sujet, le débat autour, et ce que l'auteur pèse sur le site */
export interface SubjectContext {
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
  /** Les sujets sur lesquels l'auteur s'est exprimé, sur tout le site */
  subjects: number
  /** Ses prises de position sur tout le site */
  statements: number
}

/** Ce qu'une personnalité a d'elle à montrer : ses métiers, ses affiliations */
export interface FigureSubjectPage extends SubjectContext {
  /** Ses métiers actuels, par ordre alphabétique */
  occupations: string[]
  /** Ses affiliations en cours */
  organisations: Affiliation[]
}

/** Ce qu'une organisation a d'elle à montrer : ses membres */
export interface OrganisationSubjectPage extends SubjectContext {
  /** Ses membres actuels */
  members: number
}
