import { describe, expect, it } from 'vitest'
import { statementAuthorOf } from './statement-author'

const FIGURE_ID = '0f2d6c1a-5b3e-4a7c-9d8e-1f2a3b4c5d6e'

/** What actually reaches a Server Function has no type */
const asSent = (value: unknown) => value

describe('statementAuthorOf', () => {
  it('keeps a personality that was chosen', () => {
    expect(
      statementAuthorOf(
        asSent({ kind: 'existing', author: { kind: 'public_figure', id: FIGURE_ID } }),
      ),
    ).toEqual({ kind: 'existing', author: { kind: 'public_figure', id: FIGURE_ID } })
  })

  it('keeps an organisation that was chosen', () => {
    expect(
      statementAuthorOf(
        asSent({ kind: 'existing', author: { kind: 'organisation', id: 'org-1' } }),
      ),
    ).toEqual({ kind: 'existing', author: { kind: 'organisation', id: 'org-1' } })
  })

  it('keeps a personality to be created, field by field', () => {
    expect(
      statementAuthorOf(
        asSent({
          kind: 'new_figure',
          figure: {
            name: 'Jean Dupont',
            presentation: 'Un personnage public.',
            wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
            websiteUrl: '',
            notorietySources: ['https://a.example', 'https://b.example'],
          },
        }),
      ),
    ).toEqual({
      kind: 'new_figure',
      figure: {
        name: 'Jean Dupont',
        presentation: 'Un personnage public.',
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
        websiteUrl: '',
        notorietySources: ['https://a.example', 'https://b.example'],
      },
    })
  })

  it('keeps an organisation to be created, its type included', () => {
    expect(
      statementAuthorOf(
        asSent({
          kind: 'new_organisation',
          organisation: {
            name: 'CGT',
            acronym: 'CGT',
            organisationType: 'union',
            presentation: 'Une confédération syndicale.',
            wikipediaUrl: '',
            websiteUrl: 'https://cgt.example',
            notorietySources: ['https://a.example', 'https://b.example'],
          },
        }),
      ),
    ).toMatchObject({
      kind: 'new_organisation',
      organisation: { organisationType: 'union', acronym: 'CGT' },
    })
  })

  /*
   * The four cases below used to throw the command: a switch with no default
   * returned undefined, and a missing payload broke on destructuring. A kind
   * we do not recognise now becomes the choice of a personality without an
   * id, which the read refuses cleanly.
   */
  it('brings an unknown kind back to an empty choice', () => {
    expect(statementAuthorOf(asSent({ kind: 'new_alien', alien: {} }))).toEqual({
      kind: 'existing',
      author: { kind: 'public_figure', id: '' },
    })
  })

  it('brings nothing at all back to an empty choice', () => {
    expect(statementAuthorOf(asSent(undefined))).toEqual({
      kind: 'existing',
      author: { kind: 'public_figure', id: '' },
    })
    expect(statementAuthorOf(asSent('a string'))).toEqual({
      kind: 'existing',
      author: { kind: 'public_figure', id: '' },
    })
  })

  it('brings a chosen author with no payload back to an empty id', () => {
    expect(statementAuthorOf(asSent({ kind: 'existing' }))).toEqual({
      kind: 'existing',
      author: { kind: 'public_figure', id: '' },
    })
    expect(
      statementAuthorOf(asSent({ kind: 'existing', author: { kind: 'martian', id: 42 } })),
    ).toEqual({ kind: 'existing', author: { kind: 'public_figure', id: '42' } })
  })

  it('brings a creation with no payload back to empty fields, which the schemas refuse', () => {
    expect(statementAuthorOf(asSent({ kind: 'new_figure' }))).toEqual({
      kind: 'new_figure',
      figure: {
        name: '',
        presentation: '',
        wikipediaUrl: '',
        websiteUrl: '',
        notorietySources: [],
      },
    })
    expect(statementAuthorOf(asSent({ kind: 'new_organisation', organisation: null }))).toEqual({
      kind: 'new_organisation',
      organisation: {
        name: '',
        acronym: '',
        organisationType: '',
        presentation: '',
        wikipediaUrl: '',
        websiteUrl: '',
        notorietySources: [],
      },
    })
  })

  it('drops from the notoriety sources what is not a useful string', () => {
    expect(
      statementAuthorOf(
        asSent({
          kind: 'new_figure',
          figure: { name: 'X', notorietySources: ['https://a.example', '', '  ', null] },
        }),
      ),
    ).toMatchObject({ figure: { notorietySources: ['https://a.example'] } })

    expect(
      statementAuthorOf(
        asSent({ kind: 'new_figure', figure: { name: 'X', notorietySources: 'not an array' } }),
      ),
    ).toMatchObject({ figure: { notorietySources: [] } })
  })
})
