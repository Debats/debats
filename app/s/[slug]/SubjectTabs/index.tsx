import SectionTabs from '../../../../components/ui/SectionTabs'

export type SubjectTab = 'positions' | 'arguments' | 'analyses'

export const SUBJECT_TAB_LABELS: Record<SubjectTab, string> = {
  positions: 'Positions',
  arguments: 'Arguments',
  analyses: 'Analyses',
}

/** Each tab is a page of its own: the positions at the subject's address, the others under it */
export const subjectTabHref = (slug: string, tab: SubjectTab): string =>
  tab === 'positions' ? `/s/${slug}` : `/s/${slug}/${tab}`

/** The tab an old `?onglet=` link meant, if any */
export function parseLegacyTabParam(value: string | undefined): SubjectTab | null {
  return value === 'arguments' || value === 'analyses' ? value : null
}

interface SubjectTabsProps {
  subjectSlug: string
  active: SubjectTab
  positionsCount: number
  argumentsCount: number
}

/**
 * Onglets de la page sujet. Positions, Arguments et Analyses existent ; la
 * chronologie est annoncée.
 */
export default function SubjectTabs({
  subjectSlug,
  active,
  positionsCount,
  argumentsCount,
}: SubjectTabsProps) {
  return (
    <SectionTabs
      ariaLabel="Sections du sujet"
      active={SUBJECT_TAB_LABELS[active]}
      tabs={[
        {
          label: 'Positions',
          count: positionsCount,
          href: subjectTabHref(subjectSlug, 'positions'),
        },
        {
          label: 'Arguments',
          count: argumentsCount,
          href: subjectTabHref(subjectSlug, 'arguments'),
        },
        { label: 'Analyses', href: subjectTabHref(subjectSlug, 'analyses') },
        { label: 'Chronologie', soon: true },
      ]}
    />
  )
}
