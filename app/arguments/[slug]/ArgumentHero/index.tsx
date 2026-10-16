import { ReactNode } from 'react'
import DetailHero from '../../../../components/layout/DetailHero'
import { plural } from '../../../../lib/plural'
import styles from './ArgumentHero.module.css'

interface ArgumentCounts {
  statements: number
  subjects: number
  authors: number
}

interface ArgumentHeroProps {
  title: string
  description: string
  counts: ArgumentCounts
  /** Menu d'administration à côté du titre, si l'utilisateur y a droit */
  adminMenu?: ReactNode
  actions: ReactNode
}

/** Bandeau d'en-tête de la page d'un argument : le raisonnement, et combien il sert. */
export default function ArgumentHero({
  title,
  description,
  counts,
  adminMenu,
  actions,
}: ArgumentHeroProps) {
  return (
    <DetailHero
      kicker={<span className={styles.label}>Argument</span>}
      title={title}
      titleAside={adminMenu}
      presentation={
        description || (
          <span className={styles.noDescription}>
            Cet argument n’a pas encore de description. Les contributeur·ices de rang Idéaliste
            peuvent en ajouter une.
          </span>
        )
      }
      stats={[
        {
          value: counts.statements,
          label: plural(counts.statements, 'prise de position', 'prises de position'),
        },
        { value: counts.subjects, label: plural(counts.subjects, 'sujet', 'sujets') },
        { value: counts.authors, label: plural(counts.authors, 'auteur·ice', 'auteur·ices') },
      ]}
      actions={actions}
    />
  )
}
