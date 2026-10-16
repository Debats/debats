import Segmented from '../../../components/ui/Segmented'

export type IndexView = 'themes' | 'activity'

/** The URL parameter carrying the view; absent means by theme */
export const INDEX_VIEW_PARAM = 'vue'

export function parseIndexView(value: string | undefined): IndexView {
  return value === 'actifs' ? 'activity' : 'themes'
}

interface IndexViewToggleProps {
  active: IndexView
}

/** Bascule entre l'index par thématique et la liste des sujets les plus actifs. */
export default function IndexViewToggle({ active }: IndexViewToggleProps) {
  return (
    <Segmented
      ariaLabel="Organiser les sujets"
      active={active === 'activity' ? 'Les plus actifs' : 'Par thématique'}
      items={[
        { label: 'Par thématique', href: '/s' },
        { label: 'Les plus actifs', href: `/s?${INDEX_VIEW_PARAM}=actifs` },
      ]}
    />
  )
}
