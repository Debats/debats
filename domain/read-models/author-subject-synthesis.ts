import { plural } from '../../lib/plural'

/**
 * Le paragraphe de synthèse de la page « un auteur sur un sujet », réduit à
 * ses morceaux de texte. C'est le seul vrai texte de la page, celui que les
 * moteurs de recherche lisent : ses règles d'accord et ses branches se
 * testent ici, le composant ne fait que les placer.
 *
 * Rien n'y accorde en genre : l'auteur est aussi bien une organisation
 * qu'une personnalité, et le site écrit de façon inclusive.
 */
export interface SubjectSynthesis {
  /** « 2 prises de position », absent quand le site n'en recense aucune */
  statements: string | null
  /** « la dernière le 24 janvier 2022 » */
  when: string | null
  /** « Positions défendues » */
  positionsLabel: string
  /** « partagées par 3 autres voix recensées ici » */
  shared: string
  /** « 2 autres positions restent ouvertes… » */
  undefended: string | null
}

export interface SynthesisInput {
  statements: number
  /** Les positions que l'auteur défend, dans l'ordre d'apparition */
  positionTitles: string[]
  /** Les autres voix qui défendent une de ses positions */
  allies: number
  /** Les positions ouvertes que personne n'a encore défendue */
  undefended: number
  /** La date de sa prise de position la plus récente, déjà mise en forme */
  latest: string | null
}

export function subjectSynthesis(input: SynthesisInput): SubjectSynthesis {
  const { statements, positionTitles, allies, undefended, latest } = input

  return {
    statements:
      statements === 0
        ? null
        : `${statements} ${plural(statements, 'prise de position', 'prises de position')}`,
    when: latest && `${statements === 1 ? 'le' : 'la dernière le'} ${latest}`,
    positionsLabel: plural(positionTitles.length, 'Position défendue', 'Positions défendues'),
    shared:
      allies > 0
        ? `${plural(positionTitles.length, 'partagée', 'partagées')} par ${allies} ${plural(
            allies,
            'autre voix recensée ici',
            'autres voix recensées ici',
          )}`
        : `que personne d’autre n’a encore ${plural(positionTitles.length, 'défendue', 'défendues')} ici`,
    undefended:
      undefended > 0
        ? `${undefended} ${plural(undefended, 'autre position reste', 'autres positions restent')} ${plural(
            undefended,
            'ouverte',
            'ouvertes',
          )} sur ce sujet sans que personne ne ${plural(undefended, 'la', 'les')} défende.`
        : null,
  }
}
