import { CarouselSlide } from '../domain/read-models/subject-carousel'
import { StatementAuthorRef } from '../domain/read-models/statement-author'
import { plural } from './plural'

/**
 * The canvas of every slide. One format for every network: a 4:5 portrait is
 * shown whole in a feed, and sits as it is in a story or a slideshow.
 */
export const SLIDE_SIZE = { width: 1080, height: 1350 } as const

/** The width the content of a slide can take, inside its margins */
export const SLIDE_PADDING = 72
export const SLIDE_WIDTH = SLIDE_SIZE.width - 2 * SLIDE_PADDING

/** The side of the QR code of the last slide, as it is shown */
export const CALL_QR_CODE = 340

/**
 * The size a text is set in, from its length: the first step it holds in, or
 * the smallest. The renderer tells nobody how tall a text came, so what fits
 * is reckoned from the count of characters.
 */
export const sizeFor = (
  text: string,
  steps: ReadonlyArray<readonly [maxLength: number, size: number]>,
  smallest: number,
): number => steps.find(([maxLength]) => text.length <= maxLength)?.[1] ?? smallest

/** The images a slide draws its authors with, by `authorKey`; null when the storage has none */
export type SlideFaces = Readonly<Record<string, string | null>>

/** Everyone a slide shows the face of */
export function facesOf(slide: CarouselSlide): StatementAuthorRef[] {
  switch (slide.kind) {
    case 'cover':
    case 'faces':
      return slide.faces
    case 'quote':
      return [slide.quote.author]
    case 'face-off':
      return slide.quotes.map((quote) => quote.author)
    case 'journey':
      return [slide.figure]
    case 'organisations':
      return slide.groups.flatMap((group) => group.entries.map((entry) => entry.organisation))
    case 'family':
      return slide.leading.faces
    default:
      return []
  }
}

/** What a slide shows, in a few words: its alternative text and its place in the dialogue */
export function slideLabel(slide: CarouselSlide): string {
  switch (slide.kind) {
    case 'cover':
      return 'Couverture'
    case 'ranking':
      return 'Les positions, de la plus à la moins soutenue'
    case 'faces':
      return `Qui défend « ${slide.position} »`
    case 'quote':
      return `Une citation de ${slide.quote.author.name}`
    case 'face-off':
      return `${slide.quotes[0].author.name} et ${slide.quotes[1].author.name}, en ${slide.year}`
    case 'families':
      return 'Les positions par famille de métiers'
    case 'journey':
      return `Le changement de position de ${slide.figure.name}`
    case 'organisations':
      return 'Les organisations et leurs positions'
    case 'curves':
      return 'Les voix de chaque position au fil des années'
    case 'balance':
      return 'La part de chaque position, période par période'
    case 'family':
      return `La famille de métiers « ${slide.family} »`
    case 'call':
      return 'Où lire la suite et contribuer'
  }
}

/** The name a slide takes on the disk of who saves it: numbered, so that they sort as they are swiped */
export const slideFileName = (slug: string, index: number): string =>
  `debats-${slug}-${String(index + 1).padStart(2, '0')}.png`

/** « 4 ans et 7 mois », « 3 mois », « 2 ans »: the time between two statements, in whole months */
export function elapsed(from: Date, to: Date): string {
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth()) -
    (to.getUTCDate() < from.getUTCDate() ? 1 : 0)
  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts = [
    years > 0 ? `${years} ${plural(years, 'an', 'ans')}` : null,
    rest > 0 ? `${rest} mois` : null,
  ].filter((part) => part !== null)
  return parts.length > 0 ? parts.join(' et ') : 'moins d’un mois'
}

/**
 * « 17 personnalités · 3 organisations »: who spoke, by kind. A kind nobody
 * belongs to is not named.
 */
export const authorsTally = (figures: number, organisations: number, separator: string): string =>
  [
    figures > 0 ? `${figures} ${plural(figures, 'personnalité', 'personnalités')}` : null,
    organisations > 0
      ? `${organisations} ${plural(organisations, 'organisation', 'organisations')}`
      : null,
  ]
    .filter((part) => part !== null)
    .join(separator)
