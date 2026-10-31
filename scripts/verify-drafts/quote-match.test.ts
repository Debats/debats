import { describe, expect, it } from 'vitest'
import { normalise, quoteAppearsIn, textOfHtml } from './quote-match'

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
