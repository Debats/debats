import Link from 'next/link'
import { FigureIndexSection } from '../../../domain/read-models/figure-index'
import { occupationFamilyHref } from '../../../domain/read-models/hrefs'
import { plural } from '../../../lib/plural'
import styles from './FigureSection.module.css'

const figuresLabel = (count: number) => `${count} ${plural(count, 'personnalité', 'personnalités')}`

/** Ce que l'en-tête dit de la section, à droite de son nom. */
export default function SectionAside({ section }: { section: FigureIndexSection }) {
  switch (section.kind) {
    case 'family':
      return (
        <Link href={occupationFamilyHref(section.family)} className={styles.more}>
          Voir {plural(section.total, 'la', 'les')} {figuresLabel(section.total)}
        </Link>
      )
    case 'others':
      return (
        <p className={styles.detail}>{section.families.map((family) => family.name).join(' · ')}</p>
      )
    case 'unassigned':
      return <p className={styles.detail}>{figuresLabel(section.total)} à renseigner</p>
  }
}
