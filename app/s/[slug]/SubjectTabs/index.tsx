import SectionTabs from '../../../../components/ui/SectionTabs'

export type SubjectTab = 'positions' | 'arguments'

interface SubjectTabsProps {
  subjectSlug: string
  active: SubjectTab
  positionsCount: number
  argumentsCount: number
}

/**
 * Onglets de la page sujet. Positions et Arguments existent ; les autres
 * annoncent les fonctionnalités à venir (analyses, chronologie).
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
      active={active === 'arguments' ? 'Arguments' : 'Positions'}
      tabs={[
        { label: 'Positions', count: positionsCount, href: `/s/${subjectSlug}` },
        { label: 'Arguments', count: argumentsCount, href: `/s/${subjectSlug}?onglet=arguments` },
        { label: 'Analyses', soon: true },
        { label: 'Chronologie', soon: true },
      ]}
    />
  )
}
