import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Couleurs du design system, en dur : le rendu OpenGraph n'a pas accès au CSS. */
export const OG_COLORS = {
  paper: '#f7f5f0',
  paper2: '#efece5',
  card: '#fffdf9',
  ink: '#15171c',
  ink2: '#4b4f58',
  ink3: '#8a8e97',
  line: '#dedad1',
  signal: '#e3243f',
} as const

export const OG_FONTS = {
  serif: 'Instrument Serif',
  sans: 'Instrument Sans',
} as const

const fontFile = (name: string) => readFile(join(process.cwd(), 'public/fonts', name))

/** Les fontes du site au format TTF, pour le moteur de rendu des images OpenGraph. */
export async function loadOgFonts() {
  const [serif, serifItalic, sans, sansSemibold] = await Promise.all([
    fontFile('InstrumentSerif-Regular.ttf'),
    fontFile('InstrumentSerif-Italic.ttf'),
    fontFile('InstrumentSans-Regular.ttf'),
    fontFile('InstrumentSans-SemiBold.ttf'),
  ])
  return [
    { name: OG_FONTS.serif, data: serif, style: 'normal' as const, weight: 400 as const },
    { name: OG_FONTS.serif, data: serifItalic, style: 'italic' as const, weight: 400 as const },
    { name: OG_FONTS.sans, data: sans, style: 'normal' as const, weight: 400 as const },
    { name: OG_FONTS.sans, data: sansSemibold, style: 'normal' as const, weight: 600 as const },
  ]
}

/** Le symbole de la marque en data URI. */
export async function loadBrandMark(): Promise<string> {
  const buffer = await readFile(join(process.cwd(), 'public/images/logo-mark.png'))
  return `data:image/png;base64,${buffer.toString('base64')}`
}

/** Charge une image publique du stockage Supabase en data URI, ou null si elle n'existe pas. */
async function loadStorageImage(
  bucket: string,
  file: string,
  mimeType: 'image/jpeg' | 'image/png',
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:64321'
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/public/${bucket}/${file}`)
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

/** L'avatar d'une personnalité, ou null s'il n'existe pas. */
export const loadAvatar = (slug: string) => loadStorageImage('avatars', `${slug}.jpg`, 'image/jpeg')

/** Le logo d'une organisation, ou null si elle n'en a pas. */
export const loadLogo = (slug: string) => loadStorageImage('logos', `${slug}.png`, 'image/png')

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '…' : text
}
