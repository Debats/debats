/**
 * Est-il raccord ? Sur un sujet, la part d'un groupe — les membres d'une de
 * ses organisations, les personnalités d'une de ses familles de métiers —
 * qui défend la même position que l'auteur, comparée à l'ensemble des voix
 * du sujet.
 *
 * La part seule ment sur les petits groupes : quatre voix sur cinq font
 * 80 %, mais cinq personnes ne disent presque rien. Chaque part porte donc
 * son intervalle de confiance, et l'écart à l'ensemble n'est tenu pour
 * concluant que lorsque cet intervalle laisse l'ensemble dehors. Ces
 * fonctions sont pures : elles comptent ce que le site recense, elles ne
 * sondent pas une population.
 */

/** Une prise de position du sujet, réduite à qui parle et pour quelle position */
export interface Voice {
  /** `authorKey` de author-on-subject : le type et l'identifiant */
  authorKey: string
  positionId: string
}

/** Les voix d'un groupe sur le sujet, et celles qui rejoignent l'auteur */
export interface GroupVoices {
  withAuthor: number
  total: number
}

export interface Alignment extends GroupVoices {
  /** withAuthor / total, zéro sur un groupe muet */
  share: number
  /** Bornes de l'intervalle de Wilson à 95 % */
  low: number
  high: number
  /** share moins la part de l'ensemble, dans [-1, 1] */
  deviation: number
  /** L'intervalle laisse la part de l'ensemble dehors */
  conclusive: boolean
}

/** Écarts-types de part et d'autre de la part observée, pour un intervalle à 95 % */
const Z = 1.96

/**
 * Intervalle de Wilson : l'intervalle de Wald se comporte mal sur les
 * effectifs que le site a, et déborde de [0, 1] sur un groupe unanime.
 */
export function wilsonInterval(successes: number, total: number): { low: number; high: number } {
  if (total <= 0) return { low: 0, high: 1 }
  const observed = successes / total
  const weight = 1 + (Z * Z) / total
  const centre = (observed + (Z * Z) / (2 * total)) / weight
  const spread =
    (Z / weight) * Math.sqrt((observed * (1 - observed)) / total + (Z * Z) / (4 * total * total))
  return { low: Math.max(0, centre - spread), high: Math.min(1, centre + spread) }
}

/**
 * Compte les voix d'un groupe : une personne qui s'est exprimée plusieurs
 * fois ne compte qu'une, et rejoint l'auteur dès qu'une de ses positions
 * est une de celles de l'auteur. Sans `members`, c'est tout le sujet.
 */
export function groupVoices(
  voices: readonly Voice[],
  hers: ReadonlySet<string>,
  members?: ReadonlySet<string>,
): GroupVoices {
  const aligned = new Map<string, boolean>()
  for (const { authorKey, positionId } of voices) {
    if (members && !members.has(authorKey)) continue
    aligned.set(authorKey, (aligned.get(authorKey) ?? false) || hers.has(positionId))
  }
  let withAuthor = 0
  aligned.forEach((isAligned) => {
    if (isAligned) withAuthor += 1
  })
  return { withAuthor, total: aligned.size }
}

/** La part d'un groupe, son intervalle, et son écart à la part de l'ensemble */
export function alignmentOf(voices: GroupVoices, reference: number): Alignment {
  const { withAuthor, total } = voices
  const share = total > 0 ? withAuthor / total : 0
  const { low, high } = wilsonInterval(withAuthor, total)
  return {
    withAuthor,
    total,
    share,
    low,
    high,
    deviation: share - reference,
    conclusive: total > 0 && (reference < low || reference > high),
  }
}

/** Un groupe auquel l'auteur appartient : une organisation, une famille de métiers */
export interface GroupDefinition {
  key: string
  kind: 'organisation' | 'occupation_family'
  label: string
  href: string
  /** Les `authorKey` des membres du groupe, l'auteur compris ou non */
  members: ReadonlySet<string>
}

export interface AlignmentRow extends GroupDefinition {
  alignment: Alignment
}

export interface SubjectAlignment {
  /** Toutes les autres voix du sujet : la référence de chaque groupe */
  everyone: Alignment
  /** Les groupes où quelqu'un d'autre s'est exprimé, du plus au moins raccord */
  rows: AlignmentRow[]
}

/**
 * L'auteur est retiré de la référence comme de ses propres groupes : la
 * question est de savoir si les autres le suivent, il n'a pas à peser dans
 * son propre dénominateur. Un groupe dont personne d'autre ne s'est exprimé
 * n'a rien à dire et ne rend pas de ligne.
 */
export function alignOnSubject(
  voices: readonly Voice[],
  hers: ReadonlySet<string>,
  self: string,
  groups: readonly GroupDefinition[],
): SubjectAlignment {
  const others = voices.filter((voice) => voice.authorKey !== self)
  const all = groupVoices(others, hers)
  const reference = all.total > 0 ? all.withAuthor / all.total : 0

  const rows = groups
    .map((group) => ({
      ...group,
      alignment: alignmentOf(groupVoices(others, hers, group.members), reference),
    }))
    .filter((row) => row.alignment.total > 0)
    .sort((a, b) => b.alignment.deviation - a.alignment.deviation)

  return { everyone: alignmentOf(all, reference), rows }
}
