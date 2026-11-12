import { describe, expect, it } from 'vitest'
import ShareStrip from '../ShareStrip'
import ShareBar, { Share } from './index'

const share = (key: string, count: number, part: number): Share => ({
  key,
  label: key,
  count,
  share: part,
})

/** Ce que la bande dessine est vérifié chez elle : `ShareStrip.test.ts` */
describe('ShareBar', () => {
  it('draws its shares as a strip that writes the percentages', () => {
    const shares = [share('a', 9, 0.9), share('b', 1, 0.1)]
    const [, strip] = ShareBar({ label: 'Ligne', shares }).props.children

    expect(strip.type).toBe(ShareStrip)
    expect(strip.props).toMatchObject({ shares, percentages: true })
  })

  it('shows no third cell when the line carries no count', () => {
    const withoutValue = ShareBar({ label: 'Ligne', shares: [share('a', 1, 1)] })
    const withValue = ShareBar({ label: 'Ligne', shares: [share('a', 1, 1)], value: 7 })

    // Un total de couples (auteur, position) n'est pas un nombre de voix :
    // la page qui ne peut pas l'afficher n'a pas de troisième colonne.
    expect(withoutValue.props.children.filter(Boolean)).toHaveLength(2)
    expect(withValue.props.children.filter(Boolean)).toHaveLength(3)
  })
})
