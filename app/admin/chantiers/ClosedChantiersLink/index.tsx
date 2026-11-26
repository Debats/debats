import ActionLink from '../../../../components/ui/ActionLink'
import { ChantierListView } from '../../../../domain/read-models/chantier-list'
import { chantiersHref } from '../hrefs'
import styles from './ClosedChantiersLink.module.css'

interface ClosedChantiersLinkProps {
  view: ChantierListView
  closedCount: number
}

/** The way to the other view of the list: the closed chantiers shown, or hidden again. Nothing when no chantier is closed */
export default function ClosedChantiersLink({ view, closedCount }: ClosedChantiersLinkProps) {
  if (closedCount === 0) return null
  const closedOnes =
    closedCount > 1 ? `les ${closedCount} chantiers clôturés` : 'le chantier clôturé'
  return (
    <p className={styles.closed}>
      <ActionLink href={chantiersHref({ withClosed: !view.withClosed })} quiet>
        {view.withClosed ? 'Masquer' : 'Afficher'} {closedOnes}
      </ActionLink>
    </p>
  )
}
