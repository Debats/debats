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

/** True when every piece of the quote is on the page, whatever the typography. */
export const quoteAppearsIn = (quote: string, pageText: string): boolean => {
  const page = normalise(pageText)
  const pieces = quote.split(CUT).map(normalise).filter(Boolean)
  return pieces.length > 0 && pieces.every((piece) => page.includes(piece))
}
