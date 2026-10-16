import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as Sentry from '@sentry/nextjs'
import { detectImageFormat, imageMimeType, ImageFormat } from '../domain/services/image-format'

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

/**
 * Formats le moteur de rendu sait embarquer. Il lit le type MIME que nous
 * annonçons et applique le parseur correspondant sans vérifier les octets :
 * annoncer un type qui ne correspond pas le fait planter, et le WebP comme
 * l'AVIF n'ont aucun parseur. D'où la détection sur la signature réelle.
 */
const EMBEDDABLE_FORMATS: ReadonlyArray<ImageFormat> = ['jpeg', 'png']

/**
 * Un logo est optionnel : son absence est normale. Un avatar est obligatoire à
 * la création d'une personnalité : s'il manque, la donnée est en défaut et il
 * faut le savoir.
 */
type Presence = 'required' | 'optional'

/** Télécharge un objet public du stockage, ou null s'il est hors d'atteinte. */
async function fetchStorageObject(path: string, presence: Presence): Promise<Buffer | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:64321'
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/public/${path}`)
    if (res.ok) return Buffer.from(await res.arrayBuffer())

    if (res.status !== 404 || presence === 'required') {
      Sentry.captureException(new Error(`OpenGraph image unavailable (${res.status}): ${path}`))
    }
    return null
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    Sentry.captureException(new Error(`OpenGraph image fetch failed (${reason}): ${path}`))
    return null
  }
}

/**
 * Charge une image publique du stockage Supabase en data URI, en annonçant le
 * type MIME de ses octets.
 *
 * Renvoie null quand l'image est absente ou illisible : une image OpenGraph
 * amputée d'un avatar vaut mieux qu'une route en erreur. Tout ce qui n'est pas
 * une absence légitime part dans Sentry.
 */
async function loadStorageImage(path: string, presence: Presence): Promise<string | null> {
  const buffer = await fetchStorageObject(path, presence)
  if (buffer === null) return null

  const format = detectImageFormat(buffer)
  if (format === null || !EMBEDDABLE_FORMATS.includes(format)) {
    Sentry.captureException(
      new Error(`OpenGraph image has an unembeddable format (${format ?? 'unknown'}): ${path}`),
    )
    return null
  }

  return `data:${imageMimeType(format)};base64,${buffer.toString('base64')}`
}

/** L'avatar d'une personnalité, ou null s'il est illisible. */
export const loadAvatar = (slug: string) => loadStorageImage(`avatars/${slug}.jpg`, 'required')

/** Le logo d'une organisation, ou null si elle n'en a pas. */
export const loadLogo = (slug: string) => loadStorageImage(`logos/${slug}.png`, 'optional')

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 3) + '…' : text
}
