const TITLE_LINE = /^#\s+(.+?)\s*$/m
const MAX_TITLE = 120
const BRIEF_TITLE = 80

/**
 * How a chantier gets its name. The agent is asked to open its first answer
 * with a title line (`# La taxe Zucman`); when it does, that is the name.
 * Until then, or when it does not, the brief itself names the chantier, cut
 * at a word so a card can hold it.
 */
export function chantierTitle(brief: string, firstAnswer?: string): string {
  const named = firstAnswer?.match(TITLE_LINE)?.[1]
  if (named) return named.slice(0, MAX_TITLE)
  return shortened(brief.trim().replace(/\s+/g, ' '), BRIEF_TITLE)
}

/** The agent's answer without its title line, which the card already shows */
export function withoutTitleLine(answer: string): string {
  return answer.replace(TITLE_LINE, '').trim()
}

function shortened(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const atWord = cut.lastIndexOf(' ')
  return `${atWord > max / 2 ? cut.slice(0, atWord) : cut}…`
}
