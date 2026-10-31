import { describe, expect, it } from 'vitest'
import { actContent, declarationContent, voteContent } from '../../domain/entities/statement'
import { verdictFor } from './verdict'

const words = declarationContent('Il faut supprimer le droit du sol.')

/** A page with the body of an article around the part that matters */
const article = (html: string) =>
  `<p>${'Un article de presse, long comme il se doit. '.repeat(5)}</p>${html}`

describe('verdictFor', () => {
  it('is verified when the page carries the words', () => {
    expect(
      verdictFor(words, 'https://lemonde.fr/a', {
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: article('<p>« Il faut supprimer le droit du sol », a-t-il lancé.</p>'),
      }),
    ).toEqual({ kind: 'verified' })
  })

  it('is missing when the page answers but does not carry the words', () => {
    expect(
      verdictFor(words, 'https://lemonde.fr/a', {
        status: 200,
        contentType: 'text/html',
        body: article('<p>Un article sur tout autre chose.</p>'),
      }),
    ).toEqual({ kind: 'missing' })
  })

  it('is close when most of the words are on the page, for a person to compare', () => {
    const verdict = verdictFor(
      declarationContent(
        'Le grand remplacement est une réalité, et ceux qui le nient trompent les Français, tout simplement',
      ),
      'https://lemonde.fr/a',
      {
        status: 200,
        contentType: 'text/html',
        body: article(`<p>« Le grand remplacement est une réalité, et ceux qui le nient mentent aux
          Français, tout simplement », a-t-il lancé.</p>`),
      },
    )

    expect(verdict.kind).toBe('close')
    expect(verdict).toHaveProperty('coverage')
  })

  it('leaves a page that answers without words to a human: a wall asking for a browser', () => {
    expect(
      verdictFor(words, 'https://www.vie-publique.fr/discours/1', {
        status: 200,
        contentType: 'text/html',
        body: `<html><body><script>window.location.href='/redirect_X/discours/1'</script>
          <noscript>This website requires JS enabled and cookies</noscript></body></html>`,
      }),
    ).toEqual({ kind: 'unverifiable', reason: 'page sans texte' })
    expect(
      verdictFor(voteContent('PPL Yadan', 'pour'), 'https://www.vie-publique.fr/discours/1', {
        status: 200,
        contentType: 'text/html',
        body: '<noscript>This website requires JS enabled and cookies</noscript>',
      }),
    ).toEqual({ kind: 'unverifiable', reason: 'page sans texte' })
  })

  it('is unreachable when the source does not answer, and says how', () => {
    expect(
      verdictFor(words, 'https://lemonde.fr/a', {
        status: 404,
        contentType: 'text/html',
        body: '',
      }),
    ).toEqual({ kind: 'unreachable', reason: 'HTTP 404' })
    expect(verdictFor(words, 'https://lemonde.fr/a', { error: 'ETIMEDOUT' })).toEqual({
      kind: 'unreachable',
      reason: 'ETIMEDOUT',
    })
  })

  it('leaves a source that turns robots away to a human: it is there, just not for a machine', () => {
    expect(
      verdictFor(words, 'https://lepoint.fr/a', {
        status: 403,
        contentType: 'text/html',
        body: '',
      }),
    ).toEqual({ kind: 'unverifiable', reason: 'HTTP 403' })
    expect(
      verdictFor(words, 'https://lepoint.fr/a', {
        status: 429,
        contentType: 'text/html',
        body: '',
      }),
    ).toEqual({ kind: 'unverifiable', reason: 'HTTP 429' })
  })

  it('leaves a source a machine cannot read to a human: a social network, a video, a PDF', () => {
    expect(verdictFor(words, 'https://x.com/user/status/1', null)).toEqual({
      kind: 'unverifiable',
      reason: 'x.com',
    })
    expect(verdictFor(words, 'https://www.youtube.com/watch?v=1', null)).toEqual({
      kind: 'unverifiable',
      reason: 'youtube.com',
    })
    expect(
      verdictFor(words, 'https://senat.fr/rap.pdf', {
        status: 200,
        contentType: 'application/pdf',
        body: '',
      }),
    ).toEqual({ kind: 'unverifiable', reason: 'application/pdf' })
  })

  it('only asks a vote or an act for a source that answers: they carry no words to find', () => {
    const page = { status: 200, contentType: 'text/html', body: article('<p>Scrutin n° 322</p>') }

    expect(verdictFor(voteContent('PPL Yadan', 'pour'), 'https://senat.fr/s', page)).toEqual({
      kind: 'reachable',
    })
    expect(verdictFor(actContent('Signature de la tribune'), 'https://lemonde.fr/t', page)).toEqual(
      { kind: 'reachable' },
    )
  })
})
