import { Signatory, signatoriesLabel } from '../../../../domain/read-models/joint-declaration'
import SignatoryLine from './SignatoryLine'
import styles from './SignatoriesCard.module.css'

interface SignatoriesCardProps {
  signatories: Signatory[]
}

/** Carte du rail : qui a signé le texte, tout le monde visible, sur deux colonnes. */
export default function SignatoriesCard({ signatories }: SignatoriesCardProps) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Signataires recensé·e·s</h2>
      <p className={styles.count}>{signatoriesLabel(signatories.map(({ author }) => author))}</p>
      {signatories.length > 0 && (
        <ul className={styles.list}>
          {signatories.map((signatory) => (
            <li key={`${signatory.author.kind}-${signatory.author.id}`} className={styles.item}>
              <SignatoryLine signatory={signatory} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
