import { ReactNode } from 'react'
import { OG_COLORS, OG_FONTS, truncate } from '../../../lib/og'
import { SLIDE_PADDING } from '../../../lib/carousel-image'
import { kicker, ON_INK_QUIET, row } from './styles'

/** What every slide of a subject carries: whose debate it is, and where to read it */
export interface SlideChrome {
  title: string
  problem: string
  /** Where the subject is read, as it is typed: `debats.co/s/…` */
  address: string
  /** The mark of the brand as a data URI */
  brandMark: string
}

interface CarouselFrameProps {
  chrome: SlideChrome
  /** The top right corner: the subject unless the slide says otherwise */
  corner?: string
  /** A few words at the foot, beside the address */
  note?: string
  /** On the ink ground instead of the paper */
  dark?: boolean
  children: ReactNode
}

/** A foot holds the address whole: the note gives way when both do not fit */
const FOOT_CHARACTERS = 68

/**
 * The frame of a slide: the brand and the subject above, the address of the
 * subject below. A slide is shared alone as often as in its carousel, so each
 * one says whose debate it is and where the rest is read. Inline styles only:
 * the renderer reads no CSS.
 */
export default function CarouselFrame({
  chrome,
  corner,
  note,
  dark,
  children,
}: CarouselFrameProps) {
  const quiet = dark ? ON_INK_QUIET : OG_COLORS.ink2
  const fits = note !== undefined && chrome.address.length + note.length <= FOOT_CHARACTERS
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: `${SLIDE_PADDING}px`,
        backgroundColor: dark ? OG_COLORS.ink : OG_COLORS.paper,
        color: dark ? OG_COLORS.paper : OG_COLORS.ink,
        fontFamily: OG_FONTS.sans,
      }}
    >
      <div style={{ ...row(), justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={row(14)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- le moteur OpenGraph ne connaît pas next/image */}
          <img src={chrome.brandMark} alt="" height={44} />
          <span style={{ fontSize: '30px', fontWeight: 600 }}>Débats.co</span>
        </div>
        <span style={{ ...kicker, color: quiet }}>{corner ?? truncate(chrome.title, 34)}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {children}
      </div>

      <div
        style={{
          ...row(24),
          justifyContent: 'space-between',
          flexShrink: 0,
          paddingTop: '28px',
          borderTop: `2px solid ${dark ? OG_COLORS.ink2 : OG_COLORS.line}`,
        }}
      >
        <span style={{ fontSize: chrome.address.length > 40 ? '22px' : '26px', fontWeight: 600 }}>
          {chrome.address}
        </span>
        {fits && <span style={{ fontSize: '24px', color: quiet }}>{note}</span>}
      </div>
    </div>
  )
}
