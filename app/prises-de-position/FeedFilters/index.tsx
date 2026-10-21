import Segmented from '../../../components/ui/Segmented'
import NavSelect from '../../../components/ui/NavSelect'
import { STATEMENT_TYPE_LABELS, STATEMENT_TYPES } from '../../../domain/entities/statement'
import { Theme } from '../../../domain/entities/theme'
import { FeedFilters as Filters, feedHref } from '../../../domain/read-models/statement-feed'
import styles from './FeedFilters.module.css'

interface FeedFiltersProps {
  filters: Filters
  themes: Theme[]
}

const KIND_LABELS = { all: 'Tout', public_figure: 'Personnalités', organisation: 'Organisations' }

/** Les filtres du flux, tous portés par l'adresse de la page. */
export default function FeedFilters({ filters, themes }: FeedFiltersProps) {
  return (
    <div className={styles.toolbar}>
      <Segmented
        ariaLabel="Filtrer par type d’auteur"
        active={KIND_LABELS[filters.authorKind ?? 'all']}
        items={[
          { label: KIND_LABELS.all, href: feedHref({ ...filters, authorKind: undefined }) },
          {
            label: KIND_LABELS.public_figure,
            href: feedHref({ ...filters, authorKind: 'public_figure' }),
          },
          {
            label: KIND_LABELS.organisation,
            href: feedHref({ ...filters, authorKind: 'organisation' }),
          },
        ]}
      />
      <div className={styles.selects}>
        <NavSelect
          ariaLabel="Thème"
          any={{ label: 'Tous les thèmes', href: feedHref({ ...filters, themeSlug: undefined }) }}
          options={themes.map((theme) => ({
            value: theme.slug,
            label: theme.name,
            href: feedHref({ ...filters, themeSlug: theme.slug }),
          }))}
          value={filters.themeSlug}
        />
        <NavSelect
          ariaLabel="Type de prise de position"
          any={{
            label: 'Tous les types',
            href: feedHref({ ...filters, statementType: undefined }),
          }}
          options={STATEMENT_TYPES.map((type) => ({
            value: type,
            label: STATEMENT_TYPE_LABELS[type],
            href: feedHref({ ...filters, statementType: type }),
          }))}
          value={filters.statementType}
        />
      </div>
    </div>
  )
}
