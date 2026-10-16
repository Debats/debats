import SectionTabs from '../../../../components/ui/SectionTabs'

export type SubjectTab = 'positions' | 'arguments' | 'analyses'

export function parseSubjectTab(value: string | undefined): SubjectTab {
  if (value === 'arguments' || value === 'analyses') return value
  return 'positions'
}

const TAB_LABELS: Record<SubjectTab, string> = {
  positions: 'Positions',
  arguments: 'Arguments',
  analyses: 'Analyses',
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
      active={TAB_LABELS[active]}
      tabs={[
        { label: 'Positions', count: positionsCount, href: `/s/${subjectSlug}` },
        { label: 'Arguments', count: argumentsCount, href: `/s/${subjectSlug}?onglet=arguments` },
        { label: 'Analyses', href: `/s/${subjectSlug}?onglet=analyses` },
        { label: 'Chronologie', soon: true },
      ]}
    />
  )
}
