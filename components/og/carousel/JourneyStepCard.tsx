import { JourneyStep } from '../../../domain/read-models/subject-carousel'
import { formatShortDate } from '../../../lib/format-date'
import { OG_COLORS, truncate } from '../../../lib/og'
import { column, kicker, serif } from './styles'

interface JourneyStepCardProps {
  step: JourneyStep
}

const LINE_MAX = 190

/** One of the two statements of a journey: its year in large, the position, what was said or done */
export default function JourneyStepCard({ step }: JourneyStepCardProps) {
  const line = truncate(step.line, LINE_MAX)
  const [day, month] = formatShortDate(step.statedAt).split(' ')
  return (
    <div style={{ display: 'flex', gap: '32px' }}>
      <div style={{ ...column(6), width: '150px', flexShrink: 0 }}>
        <span style={serif(80, 0.9)}>{step.statedAt.getUTCFullYear()}</span>
        <span style={{ fontSize: '24px', color: OG_COLORS.ink2 }}>{`${day} ${month}`}</span>
      </div>
      <div
        style={{
          ...column(18),
          flex: 1,
          padding: '34px 36px',
          borderRadius: '20px',
          backgroundColor: OG_COLORS.card,
        }}
      >
        <span style={kicker}>{truncate(step.position, 80)}</span>
        <span style={serif(line.length > 120 ? 36 : 42, 1.18)}>
          {step.worded ? `« ${line} »` : line}
        </span>
        <span style={{ fontSize: '24px', color: OG_COLORS.ink2 }}>
          {`${step.typeLabel} · ${truncate(step.sourceName, 34)}`}
        </span>
      </div>
    </div>
  )
}
