import ActionLink from '../../components/ui/ActionLink'
import { ThemeDebates } from '../../domain/read-models/home-debates'
import { themeHref } from '../../domain/read-models/hrefs'
import DebateRow from '../DebateRow'
import styles from './DebateMap.module.css'

/** Une thématique sur la carte : son nom, le lien vers tous ses sujets, ses sujets les plus discutés. */
export default function ThemeDebatesCard({ entry }: { entry: ThemeDebates }) {
  const { theme, debates, subjectsCount } = entry

  return (
    <section className={styles.theme}>
      <header className={styles.themeHead}>
        <h3 className={styles.themeName}>{theme.name}</h3>
        <ActionLink href={themeHref(theme.slug)}>
          {subjectsCount === 1 ? 'Le sujet' : `Les ${subjectsCount} sujets`}
        </ActionLink>
      </header>
      <ul className={styles.rows}>
        {debates.map((debate) => (
          <DebateRow key={debate.id} debate={debate} />
        ))}
      </ul>
    </section>
  )
}
