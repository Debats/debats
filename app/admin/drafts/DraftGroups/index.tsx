import Link from 'next/link'
import Segmented from '../../../../components/ui/Segmented'
import { plural } from '../../../../lib/plural'
import {
  DRAFT_GROUPINGS,
  DraftGroup,
  DraftGrouping,
  draftGroupingLabel,
  draftGroupingNouns,
  draftsViewHref,
} from '../../../../domain/read-models/drafts-view'
import styles from './DraftGroups.module.css'

interface DraftGroupsProps {
  grouping: DraftGrouping
  groups: DraftGroup[]
}

/** The groups of pending drafts under one grouping, with the way to the other groupings. */
export default function DraftGroups({ grouping, groups }: DraftGroupsProps) {
  const total = groups.reduce((sum, group) => sum + group.count, 0)

  return (
    <>
      <div className={styles.groupings}>
        <Segmented
          ariaLabel="Regrouper les brouillons"
          active={draftGroupingLabel(grouping)}
          items={DRAFT_GROUPINGS.map((candidate) => ({
            label: draftGroupingLabel(candidate),
            href: draftsViewHref({ grouping: candidate }),
          }))}
        />
      </div>

      {groups.length === 0 ? (
        <p className={styles.empty}>Aucun brouillon en attente de validation.</p>
      ) : (
        <>
          <p className={styles.total}>
            {`${total} ${plural(total, 'brouillon', 'brouillons')} en attente, `}
            {`${groups.length} ${plural(groups.length, ...draftGroupingNouns(grouping))}`}
          </p>
          <ul className={styles.groupList}>
            {groups.map(({ label, count }) => (
              <li key={label}>
                <Link
                  href={draftsViewHref({ grouping, group: label })}
                  className={styles.groupLink}
                >
                  {label}
                  <span className={styles.groupCount}>{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
