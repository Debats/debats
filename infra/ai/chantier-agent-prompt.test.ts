import { describe, expect, it } from 'vitest'
import { chantierOpeningMessage } from './chantier-agent-prompt'

const SITE = 'https://debats.co'

const fresh = {
  id: 'chantier-1',
  brief: 'Qui s’est positionné sur la taxe Zucman ?',
  title: null,
  existingDrafts: 0,
  recap: null,
}

const adopted = {
  id: 'chantier-2',
  brief: 'Lance le chantier des 100 sujets du MVP.',
  title: '100 sujets MVP',
  existingDrafts: 224,
  recap: null,
}

describe('chantierOpeningMessage', () => {
  it('asks a fresh chantier for its title and a plan, and says where the site is', () => {
    const message = chantierOpeningMessage(fresh, SITE)

    expect(message).toContain('Consigne : Qui s’est positionné sur la taxe Zucman ?')
    expect(message).toContain('DEBATS_URL=https://debats.co')
    expect(message).toContain('"chantier": "chantier-1"')
    expect(message).toContain('le titre du chantier (une ligne « # … »)')
    expect(message).not.toContain('repris')
  })

  it('tells an adopted chantier its title and what it holds, and asks for an inventory first', () => {
    const message = chantierOpeningMessage(adopted, SITE)

    expect(message).toContain('intitulé « 100 sujets MVP », repris : il porte déjà 224 brouillons')
    expect(message).toContain('GET /api/drafts?chantier=chantier-2')
    expect(message).toContain('pas de ligne « # »')
    expect(message).not.toContain('a laissé')
  })

  it('hands over the recap of the pass before, between the brief and the site', () => {
    const message = chantierOpeningMessage(
      { ...adopted, recap: 'Vingt-six sujets traités, 224 brouillons postés.' },
      SITE,
    )

    const brief = message.indexOf('Consigne :')
    const recap = message.indexOf('Vingt-six sujets traités, 224 brouillons postés.')
    const site = message.indexOf('Le site est à')
    expect(message).toContain('à lire comme votre propre bilan')
    expect(brief).toBeLessThan(recap)
    expect(recap).toBeLessThan(site)
  })
})
