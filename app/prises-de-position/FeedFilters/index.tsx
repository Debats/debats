'use client'

import { useRouter } from 'next/navigation'
import Segmented from '../../../components/ui/Segmented'
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
  const router = useRouter()
  const go = (changed: Partial<Filters>) => router.push(feedHref({ ...filters, ...changed }))

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
        <select
          className={styles.select}
          aria-label="Thème"
          value={filters.themeSlug ?? ''}
          onChange={(event) => go({ themeSlug: event.target.value || undefined })}
        >
          <option value="">Tous les thèmes</option>
          {themes.map((theme) => (
            <option key={theme.id} value={theme.slug}>
              {theme.name}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Type de prise de position"
          value={filters.statementType ?? ''}
          onChange={(event) =>
            go({
              statementType: STATEMENT_TYPES.find((type) => type === event.target.value),
            })
          }
        >
          <option value="">Tous les types</option>
          {STATEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {STATEMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
