/**
 * Does a page carry the words a draft puts in someone's mouth?
 *
 * The comparison forgives everything that is typography — case, accents,
 * curly quotes, spacing, punctuation — and forgives nothing that is wording.
 */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  euml: 'ë',
  agrave: 'à',
  acirc: 'â',
  ccedil: 'ç',
  ugrave: 'ù',
  ucirc: 'û',
  ocirc: 'ô',
  icirc: 'î',
  iuml: 'ï',
  oelig: 'œ',
}

const decodeEntities = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? whole)

/** The words of an HTML page, without its markup, scripts and styles. */
export const textOfHtml = (html: string): string =>
  decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()

/** Letters and digits only, lower-cased and unaccented, one space between words. */
export const normalise = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** A quote may be cut: « … », […], (...) or ... each mark a piece left out. */
const CUT = /\[(?:\.{3}|…)\]|\((?:\.{3}|…)\)|…|\.{3}/

const piecesOf = (quote: string): string[] => quote.split(CUT).map(normalise).filter(Boolean)

/** True when every piece of the quote is on the page, whatever the typography. */
export const quoteAppearsIn = (quote: string, pageText: string): boolean => {
  const page = normalise(pageText)
  const pieces = piecesOf(quote)
  return pieces.length > 0 && pieces.every((piece) => page.includes(piece))
}

/** How many words in a row make a window worth looking for */
const WINDOW = 6

/** The runs of WINDOW words of a piece; a piece shorter than that is one window */
const windowsOf = (piece: string): string[] => {
  const words = piece.split(' ')
  if (words.length <= WINDOW) return [piece]
  return Array.from({ length: words.length - WINDOW + 1 }, (_, i) =>
    words.slice(i, i + WINDOW).join(' '),
  )
}

/**
 * The share of the quote the page carries, from 0 to 1: a word changed in the
 * middle of a quote costs a few windows, not the whole quote. This tells a
 * paraphrase (most windows found) from an invention (none found).
 */
export const coverageOf = (quote: string, pageText: string): number => {
  const page = normalise(pageText)
  const windows = piecesOf(quote).flatMap(windowsOf)
  if (windows.length === 0) return 0
  const found = windows.filter((window) => page.includes(window)).length
  return found / windows.length
}
