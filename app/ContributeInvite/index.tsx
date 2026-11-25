import Link from 'next/link'
import Button from '../../components/ui/Button'
import {
  CONTRIBUTE_HREF,
  NEW_STATEMENT_HREF,
  REVIEW_QUEUE_HREF,
} from '../../domain/read-models/hrefs'
import styles from './ContributeInvite.module.css'

/** Les façons de contribuer, de la plus accessible à la plus engageante */
const WAYS = [
  {
    title: 'Vérifier une source',
    text: 'Ouvrir la source d’une prise de position et confirmer qu’elle y figure.',
    href: REVIEW_QUEUE_HREF,
  },
  {
    title: 'Ajouter une prise de position',
    text: 'Un discours, un vote, une tribune : ce qui a été dit ou fait, avec sa source.',
    href: NEW_STATEMENT_HREF,
  },
  {
    title: 'Proposer ce qui manque',
    text: 'Un sujet, une personnalité, une organisation, une déclaration commune.',
    href: CONTRIBUTE_HREF,
  },
] as const

/**
 * L'appel à contribuer, au pied de l'accueil, en encre sur papier : le site
 * s'écrit à plusieurs, et voici par où commencer.
 */
export default function ContributeInvite() {
  return (
    <section className={styles.invite}>
      <div className={styles.pitch}>
        <p className={styles.kicker}>Contribuer</p>
        <h2 className={styles.title}>Débats.co s’écrit à plusieurs</h2>
        <p className={styles.text}>
          Chaque prise de position du site a été trouvée, sourcée et relue par des
          contributeur·ices. Il en manque encore beaucoup.
        </p>
        <Button href={CONTRIBUTE_HREF} variant="inverse">
          Comment contribuer
        </Button>
      </div>
      <ol className={styles.ways}>
        {WAYS.map((way) => (
          <li key={way.title}>
            <Link href={way.href} className={styles.way}>
              <span className={styles.wayTitle}>{way.title} →</span>
              <span className={styles.wayText}>{way.text}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
