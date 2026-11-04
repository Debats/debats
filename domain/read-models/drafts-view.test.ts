import { describe, it, expect } from 'vitest'
import {
  authorDraftsHref,
  DraftGrouping,
  draftGroupsOf,
  draftsViewHref,
  parseDraftsView,
} from './drafts-view'

describe('parseDraftsView', () => {
  it('reads nothing as the subjects, none of them opened', () => {
    expect(parseDraftsView({})).toEqual({ grouping: 'subject' })
  })

  it('reads the grouping the `par` parameter asks for', () => {
    expect(parseDraftsView({ par: 'personnalites' })).toEqual({ grouping: 'public_figure' })
    expect(parseDraftsView({ par: 'organisations' })).toEqual({ grouping: 'organisation' })
  })

  it('ignores a grouping it does not know', () => {
    expect(parseDraftsView({ par: 'arguments' })).toEqual({ grouping: 'subject' })
  })

  it('reads the group a parameter opens, and its grouping with it', () => {
    expect(parseDraftsView({ personnalite: 'Gabriel Attal' })).toEqual({
      grouping: 'public_figure',
      group: 'Gabriel Attal',
    })
    expect(parseDraftsView({ organisation: 'Greenpeace' })).toEqual({
      grouping: 'organisation',
      group: 'Greenpeace',
    })
    expect(parseDraftsView({ sujet: 'Le montant du SMIC' })).toEqual({
      grouping: 'subject',
      group: 'Le montant du SMIC',
    })
  })

  it('lets the opened group decide the grouping, whatever `par` says', () => {
    expect(parseDraftsView({ par: 'sujets', personnalite: 'Gabriel Attal' })).toEqual({
      grouping: 'public_figure',
      group: 'Gabriel Attal',
    })
  })

  it('ignores an empty group', () => {
    expect(parseDraftsView({ personnalite: '' })).toEqual({ grouping: 'subject' })
  })
})

describe('draftsViewHref', () => {
  it('leaves the default grouping out of the address', () => {
    expect(draftsViewHref({ grouping: 'subject' })).toBe('/admin/drafts')
  })

  it('carries a grouping without any group opened', () => {
    expect(draftsViewHref({ grouping: 'public_figure' })).toBe('/admin/drafts?par=personnalites')
    expect(draftsViewHref({ grouping: 'organisation' })).toBe('/admin/drafts?par=organisations')
  })

  it('carries the opened group under the name of its grouping', () => {
    expect(draftsViewHref({ grouping: 'public_figure', group: 'Gabriel Attal' })).toBe(
      '/admin/drafts?personnalite=Gabriel+Attal',
    )
    expect(draftsViewHref({ grouping: 'subject', group: 'Le montant du SMIC' })).toBe(
      '/admin/drafts?sujet=Le+montant+du+SMIC',
    )
  })

  it('reads back every address it writes', () => {
    const views = [
      { grouping: 'subject' as DraftGrouping },
      { grouping: 'public_figure' as DraftGrouping },
      { grouping: 'organisation' as DraftGrouping },
      { grouping: 'subject' as DraftGrouping, group: 'Le montant du SMIC' },
      { grouping: 'organisation' as DraftGrouping, group: 'Les Amis de la Terre' },
    ]
    for (const view of views) {
      const url = new URL(draftsViewHref(view), 'https://debats.co')
      expect(parseDraftsView(Object.fromEntries(url.searchParams))).toEqual(view)
    }
  })
})

describe('draftGroupsOf', () => {
  it('makes no group out of nothing', () => {
    expect(draftGroupsOf([])).toEqual([])
  })

  it('counts how many drafts each label gathers', () => {
    expect(draftGroupsOf(['Le SMIC', 'Le nucléaire', 'Le SMIC'])).toEqual([
      { label: 'Le SMIC', count: 2 },
      { label: 'Le nucléaire', count: 1 },
    ])
  })

  it('shows the fullest group first, and sorts the ties by label', () => {
    expect(draftGroupsOf(['Zoé Durand', 'Alice Martin', 'Alice Martin', 'Bruno Petit'])).toEqual([
      { label: 'Alice Martin', count: 2 },
      { label: 'Bruno Petit', count: 1 },
      { label: 'Zoé Durand', count: 1 },
    ])
  })
})

describe('authorDraftsHref', () => {
  const attal = { kind: 'public_figure' as const, name: 'Gabriel Attal' }

  it('leads to every draft of that author, grouped by her kind', () => {
    expect(authorDraftsHref({ grouping: 'subject', group: 'Le SMIC' }, attal)).toBe(
      '/admin/drafts?personnalite=Gabriel+Attal',
    )
    expect(
      authorDraftsHref(
        { grouping: 'subject', group: 'Le SMIC' },
        {
          kind: 'organisation',
          name: 'Greenpeace',
        },
      ),
    ).toBe('/admin/drafts?organisation=Greenpeace')
  })

  it('leads nowhere when the view already shows that author', () => {
    expect(
      authorDraftsHref({ grouping: 'public_figure', group: 'Gabriel Attal' }, attal),
    ).toBeUndefined()
  })

  it('still leads to the author of a namesake group of another kind', () => {
    expect(authorDraftsHref({ grouping: 'organisation', group: 'Gabriel Attal' }, attal)).toBe(
      '/admin/drafts?personnalite=Gabriel+Attal',
    )
  })
})
