import { DraftStatement } from '../entities/draft-statement'

/** What became of the drafts of a chantier, counted for its card */
export interface DraftTally {
  total: number
  pending: number
  validated: number
  /** Rejected, or sent back for revision: not on the site, not waiting either */
  setAside: number
}

export function tallyDrafts(drafts: readonly DraftStatement[]): DraftTally {
  return drafts.reduce<DraftTally>(
    (tally, { status }) => ({
      total: tally.total + 1,
      pending: tally.pending + (status === 'pending' ? 1 : 0),
      validated: tally.validated + (status === 'validated' ? 1 : 0),
      setAside: tally.setAside + (status === 'rejected' || status === 'revision_requested' ? 1 : 0),
    }),
    { total: 0, pending: 0, validated: 0, setAside: 0 },
  )
}

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`

/** The tally in one line: « 14 brouillons · 5 validés · 6 à relire · 3 écartés » */
export function tallyLine(tally: DraftTally): string {
  if (tally.total === 0) return 'Aucun brouillon pour l’instant'
  return [
    plural(tally.total, 'brouillon', 'brouillons'),
    ...(tally.validated > 0 ? [plural(tally.validated, 'validé', 'validés')] : []),
    ...(tally.pending > 0 ? [`${tally.pending} à relire`] : []),
    ...(tally.setAside > 0 ? [plural(tally.setAside, 'écarté', 'écartés')] : []),
  ].join(' · ')
}
