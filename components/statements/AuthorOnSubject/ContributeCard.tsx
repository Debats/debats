import Link from 'next/link'
import styles from './AuthorOnSubject.module.css'

interface ContributeCardProps {
  authorName: string
  statements: number
}

/**
 * La page est creuse parce que la donnée manque. Sur un site participatif,
 * c'est la meilleure chose à dire au visiteur qui vient d'arriver, et le
 * seul bloc qui transforme le trafic des moteurs en contribution.
 */
export default function ContributeCard({ authorName, statements }: ContributeCardProps) {
  return (
    <section className={styles.contribute}>
      <h2 className={styles.contributeTitle}>Il manque une déclaration ?</h2>
      <p className={styles.contributeBody}>
        {statements === 0
          ? `Débats.co n’a encore aucune prise de position de ${authorName} sur ce sujet.`
          : `Cette page ne recense ${statements === 1 ? "qu'une seule prise de position" : `que ${statements} prises de position`} de ${authorName} sur ce sujet.`}{' '}
        Si vous en connaissez une autre — un discours, un vote, une interview — ajoutez-la avec sa
        source : elle apparaîtra ici après relecture.
      </p>
      <div className={styles.contributeActions}>
        <Link href="/nouvelle-prise-de-position" className={styles.contributePrimary}>
          Ajouter une prise de position
        </Link>
        <Link href="/guide" className={styles.contributeSecondary}>
          Comment nous sourçons
        </Link>
      </div>
    </section>
  )
}
