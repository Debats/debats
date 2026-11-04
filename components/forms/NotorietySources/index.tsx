'use client'

import TextField from '../../ui/TextField'
import formStyles from '../../ui/form-with-guide.module.css'
import styles from './NotorietySources.module.css'

/** The two sources an entity without a Wikipedia page must produce. */
export type NotorietySourcePair = [string, string]

/** The first two sources already recorded, padded with blanks. */
export const notorietySourcePair = (sources: readonly string[]): NotorietySourcePair => [
  sources[0] ?? '',
  sources[1] ?? '',
]

interface NotorietySourcesProps {
  /** Whose notoriety is at stake, for the reminder: « la personnalité », « l'organisation » */
  who: string
  sources: NotorietySourcePair
  onChange: (sources: NotorietySourcePair) => void
  error?: string
}

/**
 * The notoriety criterion, for want of a Wikipedia page: two publications in
 * independent and reliable sources. Shared by the forms of a public figure and
 * of an organisation, which show it while the Wikipedia URL is empty — so the
 * reminder of why the block appeared is shown wherever it appears.
 */
export default function NotorietySources({ who, sources, onChange, error }: NotorietySourcesProps) {
  const [first, second] = sources

  return (
    <div className={styles.notoriety}>
      <p className={styles.notorietyTitle}>Sources de notoriété</p>
      <div className={formStyles.guide}>
        <p className={formStyles.guideTitle}>Pourquoi ?</p>
        <p className={formStyles.guideText}>
          Sans page Wikipedia, {who} doit justifier de sa notoriété par au moins deux publications
          dans des sources indépendantes et fiables (article de presse, page institutionnelle,
          rapport officiel...).
        </p>
      </div>
      <TextField
        label="Source de notoriété 1"
        id="notorietySource1"
        type="url"
        required
        placeholder="https://lemonde.fr/..."
        value={first}
        onChange={(e) => onChange([e.target.value, second])}
      />
      <TextField
        label="Source de notoriété 2"
        id="notorietySource2"
        type="url"
        required
        placeholder="https://liberation.fr/..."
        value={second}
        onChange={(e) => onChange([first, e.target.value])}
      />
      {error && <span className={formStyles.fieldError}>{error}</span>}
    </div>
  )
}
