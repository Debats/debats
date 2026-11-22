import Link from 'next/link'
import { NEW_STATEMENT_HREF } from '../../../domain/read-models/hrefs'
import { elided } from '../../../lib/elision'
import styles from './ContributeCard.module.css'

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
  // « de Alma Dufour » n'existe pas : le nom de l'auteur décide de la forme
  const author = elided('de', authorName)

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Il manque une déclaration ?</h2>
      <p className={styles.body}>
        {statements === 0
          ? `Débats.co n’a encore aucune prise de position ${author} sur ce sujet.`
          : `Cette page ne recense ${counted(statements)} ${author} sur ce sujet.`}{' '}
        Si vous en connaissez une autre — un discours, un vote, une interview — ajoutez-la avec sa
        source : elle apparaîtra ici après relecture.
      </p>
      <div className={styles.actions}>
        <Link href={NEW_STATEMENT_HREF} className={styles.primary}>
          Ajouter une prise de position
        </Link>
        <Link href="/guide" className={styles.secondary}>
          Comment nous sourçons
        </Link>
      </div>
    </section>
  )
}

/** « qu’une seule prise de position », « que 3 prises de position » */
const counted = (statements: number) =>
  statements === 1 ? 'qu’une seule prise de position' : `que ${statements} prises de position`
