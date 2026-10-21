import SectionTabs from '../../../../components/ui/SectionTabs'

export type SubjectTab = 'positions' | 'arguments' | 'analyses' | 'chronologie'

export const SUBJECT_TAB_LABELS: Record<SubjectTab, string> = {
  positions: 'Positions',
  arguments: 'Arguments',
  analyses: 'Analyses',
  chronologie: 'Chronologie',
}

/** Each tab is a page of its own: the positions at the subject's address, the others under it */
export const subjectTabHref = (slug: string, tab: SubjectTab): string =>
  tab === 'positions' ? `/s/${slug}` : `/s/${slug}/${tab}`

/** The tab an old `?onglet=` link meant, if any */
export function parseLegacyTabParam(value: string | undefined): SubjectTab | null {
  return value === 'arguments' || value === 'analyses' || value === 'chronologie' ? value : null
}

interface SubjectTabsProps {
  subjectSlug: string
  active: SubjectTab
  positionsCount: number
  argumentsCount: number
  /** The years the debate spans, when an opinion was stated */
  statedSpan?: string
}

/** Onglets de la page sujet : Positions, Arguments, Analyses, Chronologie. */
export default function SubjectTabs({
  subjectSlug,
  active,
  positionsCount,
  argumentsCount,
  statedSpan,
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
        {
          label: 'Chronologie',
          count: statedSpan,
          href: subjectTabHref(subjectSlug, 'chronologie'),
        },
      ]}
    />
  )
}
