import Segmented from '../../../components/ui/Segmented'
import NavSelect from '../../../components/ui/NavSelect'
import { STATEMENT_TYPE_LABELS, STATEMENT_TYPES } from '../../../domain/entities/statement'
import { Theme } from '../../../domain/entities/theme'
import {
  FeedFilters as Filters,
  FeedOrder,
  feedHref,
} from '../../../domain/read-models/statement-feed'
import { declarationOptions, FeedDeclaration } from './declaration-options'
import styles from './FeedFilters.module.css'

interface FeedFiltersProps {
  filters: Filters
  order: FeedOrder
  themes: Theme[]
  /**
   * The joint declarations of the site, with how many signatures each has
   * when the page counted them: the feed is offered to narrow to the signed
   * ones only.
   */
  declarations: FeedDeclaration[]
}

const KIND_LABELS = { all: 'Tout', public_figure: 'Personnalités', organisation: 'Organisations' }

const ORDER_LABELS: Record<FeedOrder, string> = {
  stated: 'Date déclarée',
  touched: 'Ajout ou modification',
}

/** Les filtres et le tri du flux, tous portés par l'adresse de la page. */
export default function FeedFilters({ filters, order, themes, declarations }: FeedFiltersProps) {
  const offeredDeclarations = declarationOptions(declarations, filters.jointDeclarationSlug)

  return (
    <div className={styles.controls}>
      <div className={styles.toolbar}>
        <Segmented
          ariaLabel="Filtrer par type d’auteur"
          active={KIND_LABELS[filters.authorKind ?? 'all']}
          items={[
            {
              label: KIND_LABELS.all,
              href: feedHref({ ...filters, authorKind: undefined }, order),
            },
            {
              label: KIND_LABELS.public_figure,
              href: feedHref({ ...filters, authorKind: 'public_figure' }, order),
            },
            {
              label: KIND_LABELS.organisation,
              href: feedHref({ ...filters, authorKind: 'organisation' }, order),
            },
          ]}
        />
        <div className={styles.selects}>
          <NavSelect
            ariaLabel="Thème"
            any={{
              label: 'Tous les thèmes',
              href: feedHref({ ...filters, themeSlug: undefined }, order),
            }}
            options={themes.map((theme) => ({
              value: theme.slug,
              label: theme.name,
              href: feedHref({ ...filters, themeSlug: theme.slug }, order),
            }))}
            value={filters.themeSlug}
          />
          <NavSelect
            ariaLabel="Type de prise de position"
            any={{
              label: 'Tous les types',
              href: feedHref({ ...filters, statementType: undefined }, order),
            }}
            options={STATEMENT_TYPES.map((type) => ({
              value: type,
              label: STATEMENT_TYPE_LABELS[type],
              href: feedHref({ ...filters, statementType: type }, order),
            }))}
            value={filters.statementType}
          />
          {offeredDeclarations.length > 0 && (
            <NavSelect
              ariaLabel="Déclaration commune"
              any={{
                label: 'Avec ou sans déclaration commune',
                href: feedHref({ ...filters, jointDeclarationSlug: undefined }, order),
              }}
              options={offeredDeclarations.map((declaration) => ({
                value: declaration.slug,
                label: declaration.title,
                href: feedHref({ ...filters, jointDeclarationSlug: declaration.slug }, order),
              }))}
              value={filters.jointDeclarationSlug}
            />
          )}
        </div>
      </div>
      <div className={styles.order}>
        <span className={styles.orderLabel}>Trier par</span>
        <Segmented
          ariaLabel="Trier le flux"
          active={ORDER_LABELS[order]}
          items={[
            { label: ORDER_LABELS.stated, href: feedHref(filters, 'stated') },
            { label: ORDER_LABELS.touched, href: feedHref(filters, 'touched') },
          ]}
        />
      </div>
    </div>
  )
}
