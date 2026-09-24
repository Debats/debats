import SectionTabs from '../../../../components/ui/SectionTabs'

interface SubjectTabsProps {
  positionsCount: number
}

/**
 * Onglets de la page sujet. Seul « Positions » existe ; les autres annoncent
 * les fonctionnalités à venir (arguments, analyses, chronologie).
 */
export default function SubjectTabs({ positionsCount }: SubjectTabsProps) {
  return (
    <SectionTabs
      ariaLabel="Sections du sujet"
      active="Positions"
      tabs={[
        { label: 'Positions', count: positionsCount },
        { label: 'Arguments', soon: true },
        { label: 'Analyses', soon: true },
        { label: 'Chronologie', soon: true },
      ]}
    />
  )
}
