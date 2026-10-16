import Button from '../../../components/ui/Button'
import styles from './ProposeSubject.module.css'

interface ProposeSubjectProps {
  /** Le contributeur a le rang pour ajouter un sujet ; sinon on l'invite à contribuer */
  canAddSubject: boolean
}

/** Encart du rail, en encre sur papier : l'appel à proposer un sujet manquant. */
export default function ProposeSubject({ canAddSubject }: ProposeSubjectProps) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Un sujet manque ?</h2>
      <p className={styles.text}>
        Un sujet, c’est une question qui divise, sans position dans son titre. Les contributeur·ices
        de rang Éloquent peuvent en proposer.
      </p>
      <Button href={canAddSubject ? '/s/ajouter' : '/contribuer'} variant="inverse">
        {canAddSubject ? 'Proposer un sujet' : 'Contribuer'}
      </Button>
    </section>
  )
}
