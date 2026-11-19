import { FamilyRow } from '../../../domain/read-models/subject-carousel'
import { OG_COLORS, truncate } from '../../../lib/og'
import StackedBar from './StackedBar'
import { column } from './styles'

interface FamilyBarProps {
  family: FamilyRow
}

/** One family of occupations: its name, how many voices it gathers, and how they split */
export default function FamilyBar({ family }: FamilyBarProps) {
  return (
    <div style={column(10)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '30px', fontWeight: 600 }}>{truncate(family.name, 40)}</span>
        <span style={{ fontSize: '24px', color: OG_COLORS.ink2 }}>{family.total}</span>
      </div>
      <StackedBar shares={family.shares} />
    </div>
  )
}
