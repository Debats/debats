import CompanionsColumn from './CompanionsColumn'
import { Company } from '../../../domain/services/author-analyses'
import styles from './AuthorAnalyses.module.css'

interface CompanyCardProps {
  company: Company
  /** « cette personnalité », « cette organisation » */
  who: string
}

/** Qui prend le plus souvent la même position que l'auteur, et qui le plus souvent une autre. */
export default function CompanyCard({ company, who }: CompanyCardProps) {
  const nobody = company.closest.length === 0 && company.opposed.length === 0
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Qui pense comme {who}, qui pense autrement</h3>
      <p className={styles.subtitle}>
        Sur les sujets où {who} s’est exprimée, celles et ceux qui prennent le plus souvent la même
        position, et le plus souvent une autre.
      </p>
      {nobody ? (
        <p className={styles.empty}>Personne d’autre ne s’est encore exprimé sur ses sujets.</p>
      ) : (
        <div className={styles.columns}>
          <CompanionsColumn
            title="Le plus souvent du même avis"
            companions={company.closest}
            apart={false}
          />
          <CompanionsColumn
            title="Le plus souvent d’un autre avis"
            companions={company.opposed}
            apart
          />
        </div>
      )}
    </section>
  )
}
