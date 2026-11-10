import { describe, expect, it } from 'vitest'
import { coverageOf, excerptAround, normalise, quoteAppearsIn, textOfHtml } from './quote-match'

describe('textOfHtml', () => {
  it('keeps the words of a page and drops its markup, scripts and styles', () => {
    const html = `<html><head><style>p{color:red}</style><script>var x=1</script></head>
      <body><p>Il faut <b>supprimer</b> le droit du sol.</p></body></html>`

    expect(textOfHtml(html)).toBe('Il faut supprimer le droit du sol.')
  })

  it('decodes the entities the press uses around a quote', () => {
    expect(textOfHtml('&laquo;&nbsp;L&#39;exil fiscal &amp; nous&nbsp;&raquo;')).toBe(
      "« L'exil fiscal & nous »",
    )
  })
})

describe('normalise', () => {
  it('ignores case, accents, typographic quotes and spacing', () => {
    expect(normalise('  « Les 35 heures ont TUÉ notre économie ! »  ')).toBe(
      normalise('les 35 heures ont tue notre economie'),
    )
  })

  it('treats every apostrophe alike', () => {
    expect(normalise('j’accuse')).toBe(normalise("j'accuse"))
  })
})

describe('quoteAppearsIn', () => {
  const page = `Interrogé sur France Inter, il a répété : « Le grand remplacement est une
    réalité, et ceux qui le nient mentent aux Français. » Puis il a changé de sujet.`

  it('finds a quote whatever its typography', () => {
    expect(quoteAppearsIn('"Le grand remplacement est une realite"', page)).toBe(true)
  })

  it('finds a quote cut with an ellipsis when every piece is on the page', () => {
    expect(
      quoteAppearsIn('Le grand remplacement est une réalité […] mentent aux Français', page),
    ).toBe(true)
  })

  it('refuses a quote the page does not carry', () => {
    expect(quoteAppearsIn('Le grand remplacement est un mythe', page)).toBe(false)
  })

  it('refuses a quote of which one piece is missing', () => {
    expect(quoteAppearsIn('Le grand remplacement est une réalité (...) une invention', page)).toBe(
      false,
    )
  })
})

describe('coverageOf', () => {
  const page = `Il a répété : « Le grand remplacement est une réalité, et ceux qui le nient
    mentent aux Français, tout simplement. » Puis il a changé de sujet.`

  it('is 1 when the whole quote is on the page', () => {
    expect(coverageOf('Le grand remplacement est une réalité, et ceux qui le nient', page)).toBe(1)
  })

  it('is 0 when none of the quote is on the page', () => {
    expect(coverageOf('Le grand remplacement est un mythe inventé par la droite', page)).toBe(0)
  })

  it('is the share of the quote the page carries when a word was changed', () => {
    const coverage = coverageOf(
      'Le grand remplacement est une réalité, et ceux qui le nient trompent aux Français, tout simplement',
      page,
    )
    expect(coverage).toBeGreaterThan(0.4)
    expect(coverage).toBeLessThan(1)
  })

  it('judges a short quote as a whole', () => {
    expect(coverageOf('mentent aux Français', page)).toBe(1)
    expect(coverageOf('mentent aux Belges', page)).toBe(0)
  })
})

describe('excerptAround', () => {
  const page = `${'Préambule. '.repeat(60)}Il a répété : « Le grand remplacement est une réalité. » Puis il a changé de sujet. ${'Suite. '.repeat(80)}`

  it('shows the page around the first words of the quote, with the typography of the page', () => {
    const excerpt = excerptAround('le grand remplacement est une réalité', page)

    expect(excerpt).toContain('Il a répété : « Le grand remplacement est une réalité. »')
    expect(excerpt.startsWith('…')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThan(900)
  })

  it('shows the opening of the page when the quote is not found as it reads', () => {
    const excerpt = excerptAround('Un mythe inventé par la droite', page)

    expect(excerpt.startsWith('Préambule.')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
  })
})
