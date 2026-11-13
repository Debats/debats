import Segmented from '../../../components/ui/Segmented'
import { FigureIndexView, figureIndexHref } from '../../../domain/read-models/figure-index'

const LABELS: Record<FigureIndexView, string> = {
  families: 'Par métier',
  ranking: 'Les plus documentées',
}

interface FigureIndexViewToggleProps {
  active: FigureIndexView
}

/** Bascule entre l'index par famille de métiers et le classement des personnalités. */
export default function FigureIndexViewToggle({ active }: FigureIndexViewToggleProps) {
  return (
    <Segmented
      ariaLabel="Organiser les personnalités"
      active={LABELS[active]}
      items={[
        { label: LABELS.families, href: figureIndexHref('families') },
        { label: LABELS.ranking, href: figureIndexHref('ranking') },
      ]}
    />
  )
}
