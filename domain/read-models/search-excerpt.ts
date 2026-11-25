/**
 * The excerpt of a search hit, cut where the words searched stand in it: the
 * reader sees why a text that does not bear them in its title was found.
 */

export interface ExcerptPart {
  text: string
  /** Whether this part is one of the words searched */
  found: boolean
}

/**
 * A letter as the search compares it: without its accents, in lower case, a
 * ligature spelled out (« œ » is compared as « oe »)
 */
const folded = (letter: string): string =>
  letter
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** A word shorter than this marks too much to tell anything */
const MIN_MARKED_LENGTH = 2

/** A text as the search compares it, each folded letter knowing the letter it comes from */
interface Folded {
  text: string
  /** Per folded letter, where its letter starts and ends in the text read */
  spans: [number, number][]
}

/** A letter may fold into several: each of them keeps the place of the letter */
function fold(text: string): Folded {
  const spans: [number, number][] = []
  let at = 0
  const foldedText = Array.from(text)
    .map((letter) => {
      const plain = folded(letter)
      for (let i = 0; i < plain.length; i++) spans.push([at, at + letter.length])
      at += letter.length
      return plain
    })
    .join('')
  return { text: foldedText, spans }
}

/** Every stretch of the folded text one of the words covers, as [start, end[ */
function coveredStretches(haystack: string, words: string[]): [number, number][] {
  return words.flatMap((word) => {
    const stretches: [number, number][] = []
    for (let at = haystack.indexOf(word); at !== -1; at = haystack.indexOf(word, at + 1))
      stretches.push([at, at + word.length])
    return stretches
  })
}

/** The stretches in order, those that touch or overlap made one */
function merged(stretches: [number, number][]): [number, number][] {
  return [...stretches]
    .sort((a, b) => a[0] - b[0])
    .reduce<[number, number][]>((kept, [start, end]) => {
      const last = kept[kept.length - 1]
      if (last && start <= last[1]) return [...kept.slice(0, -1), [last[0], Math.max(last[1], end)]]
      return [...kept, [start, end]]
    }, [])
}

/**
 * The excerpt in parts, those that are words of the query told apart. The
 * comparison ignores accents and capitals, as the search does.
 */
export function markedExcerpt(excerpt: string, query: string): ExcerptPart[] {
  const haystack = fold(excerpt)
  const words = fold(query)
    .text.split(/\s+/)
    .filter((word) => word.length >= MIN_MARKED_LENGTH)

  const parts: ExcerptPart[] = []
  let read = 0
  for (const [start, end] of merged(coveredStretches(haystack.text, words))) {
    const from = Math.max(haystack.spans[start][0], read)
    const to = haystack.spans[end - 1][1]
    if (from > read) parts.push({ text: excerpt.slice(read, from), found: false })
    if (to > from) parts.push({ text: excerpt.slice(from, to), found: true })
    read = Math.max(read, to)
  }
  if (read < excerpt.length) parts.push({ text: excerpt.slice(read), found: false })
  return parts
}
