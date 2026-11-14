import { describe, expect, it } from 'vitest'
import { chantierOpeningMessage, chantierTakeoverMessage } from './chantier-agent-prompt'

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

describe('chantierTakeoverMessage', () => {
  const taken = {
    id: 'chantier-3',
    brief: 'Qui s’est positionné sur la taxe Zucman ?',
    title: 'La taxe Zucman',
    existingDrafts: 212,
    handover: 'La personne : Cherchez côté Sénat.\n\nVous : Douze brouillons postés.',
    notedSources: 37,
  }

  it('tells the new session it carries on a chantier under way, with what was said so far', () => {
    const message = chantierTakeoverMessage(taken, SITE)

    expect(message).toContain('Chantier chantier-3, intitulé « La taxe Zucman »')
    expect(message).toContain('Consigne : Qui s’est positionné sur la taxe Zucman ?')
    expect(message).toContain('212 brouillons')
    expect(message).toContain('Vous : Douze brouillons postés.')
    expect(message).toContain('DEBATS_URL=https://debats.co')
    expect(message).toContain('"chantier": "chantier-3"')
  })

  it('asks for no title, no inventory and no new search: a line to say it is ready', () => {
    const message = chantierTakeoverMessage(taken, SITE)

    expect(message).toContain('pas de ligne « # »')
    expect(message).toContain('GET /api/drafts?chantier=chantier-3')
    expect(message).toContain('en une ligne')
  })

  it('points at the notebook of sources, to be read again before searching anew', () => {
    const message = chantierTakeoverMessage(taken, SITE)

    expect(message).toContain('compte 37 adresses')
    expect(message).toContain('GET /api/chantiers/chantier-3/sources')
  })

  it('says the notebook is empty when the session before noted nothing, and to keep it from now on', () => {
    const message = chantierTakeoverMessage({ ...taken, notedSources: 0 }, SITE)

    expect(message).toContain('carnet de sources est vide')
    expect(message).toContain('POST /api/chantiers/chantier-3/sources')
  })

  it('says so when nothing was said before', () => {
    const message = chantierTakeoverMessage({ ...taken, title: null, handover: null }, SITE)

    expect(message).toContain('Chantier chantier-3, repris')
    expect(message).not.toContain('intitulé')
    expect(message).not.toContain('Ce qui s’est dit')
  })
})

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
