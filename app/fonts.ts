import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google'

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

/**
 * Les classes qui exposent --font-instrument-serif, --font-instrument-sans et
 * --font-jetbrains-mono, lues par styles/tokens.css. Posées sur <html> par le layout,
 * et sur le cadre des stories pour que Storybook montre la vraie typographie.
 */
export const fontVariables = [serif, sans, mono].map((font) => font.variable).join(' ')
