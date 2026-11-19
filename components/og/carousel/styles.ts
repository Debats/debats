import { OG_COLORS, OG_FONTS } from '../../../lib/og'

/**
 * The shades of ink the positions of a chart are told apart with, from the
 * most to the least supported. The site says nobody is right: no hue, only
 * lightness.
 */
export const SHADES = ['#15171c', '#6b6f78', '#a9acb2', '#d6d2c8', '#e8e4db'] as const

export const shadeOf = (index: number): string => SHADES[Math.min(index, SHADES.length - 1)]

/** The colour a text takes over a shade */
export const onShade = (index: number): string => (index < 2 ? OG_COLORS.paper : OG_COLORS.ink)

/** The secondary text of a slide on the ink ground */
export const ON_INK_QUIET = '#b9bcc3'

export const kicker = {
  fontSize: '24px',
  fontWeight: 600,
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: OG_COLORS.ink2,
} as const

export const serif = (size: number, lineHeight = 1) =>
  ({ fontFamily: OG_FONTS.serif, fontSize: `${size}px`, lineHeight }) as const

export const column = (gap = 0) =>
  ({ display: 'flex', flexDirection: 'column', gap: `${gap}px` }) as const

export const row = (gap = 0) =>
  ({ display: 'flex', alignItems: 'center', gap: `${gap}px` }) as const

/** The middle of a slide: what is left between the heading and the foot, its content centred */
export const body = (gap = 0) => ({ ...column(gap), flex: 1, justifyContent: 'center' }) as const
