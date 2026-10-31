import { describe, expect, it } from 'vitest'
import { actContent, declarationContent, voteContent } from '../../domain/entities/statement'
import { verdictFor } from './verdict'

const words = declarationContent('Il faut supprimer le droit du sol.')

describe('verdictFor', () => {
  it('is verified when the page carries the words', () => {
    expect(
      verdictFor(words, 'https://lemonde.fr/a', {
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<p>« Il faut supprimer le droit du sol », a-t-il lancé.</p>',
      }),
    ).toEqual({ kind: 'verified' })
  })

  it('is missing when the page answers but does not carry the words', () => {
    expect(
      verdictFor(words, 'https://lemonde.fr/a', {
        status: 200,
        contentType: 'text/html',
        body: '<p>Un article sur tout autre chose.</p>',
      }),
    ).toEqual({ kind: 'missing' })
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
    const page = { status: 200, contentType: 'text/html', body: '<p>Scrutin n° 322</p>' }

    expect(verdictFor(voteContent('PPL Yadan', 'pour'), 'https://senat.fr/s', page)).toEqual({
      kind: 'reachable',
    })
    expect(verdictFor(actContent('Signature de la tribune'), 'https://lemonde.fr/t', page)).toEqual(
      { kind: 'reachable' },
    )
  })
})
