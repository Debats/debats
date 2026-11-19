import { percent } from '../../../lib/percent'
import { onShade, shadeOf } from './styles'

interface StackedBarProps {
  /** One share per position, from 0 to 1, in the order of the shades */
  shares: number[]
}

/** A share is written in its segment only when the segment is wide enough to hold it */
const WRITTEN_FROM = 0.16

/** A bar of the whole, cut in as many shades as there are positions */
export default function StackedBar({ shares }: StackedBarProps) {
  return (
    <div style={{ display: 'flex', height: '48px', borderRadius: '8px', overflow: 'hidden' }}>
      {shares.map((share, index) =>
        share > 0 ? (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexGrow: share,
              flexShrink: 1,
              flexBasis: 0,
              paddingLeft: '14px',
              backgroundColor: shadeOf(index),
              color: onShade(index),
              fontSize: '24px',
              fontWeight: 600,
            }}
          >
            {share >= WRITTEN_FROM ? percent(share) : ''}
          </div>
        ) : null,
      )}
    </div>
  )
}
