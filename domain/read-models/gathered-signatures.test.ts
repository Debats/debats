import { describe, it, expect } from 'vitest'
import { StatementWithAuthorAndSubject } from '../repositories/statement-repository'
import {
  declarationIdsIn,
  gatherSignatures,
  NAMED_SIGNATORIES,
  nameSeparator,
  signatureOfFeedEntry,
  signatureOfLatest,
  signedTail,
} from './gathered-signatures'
import { LatestStatement } from './latest-statement'
import { publicFigureRef, StatementAuthorRef } from './statement-author'

const figure = (name: string) => publicFigureRef({ id: name, name, slug: name.toLowerCase() })

const manifesto = { id: 'manifesto', title: 'Le Manifeste', slug: 'le-manifeste' }
const appeal = { id: 'appeal', title: 'L’Appel', slug: 'l-appel' }

/** A feed entry reduced to what the gathering reads: who, and which text she signed if any */
const entry = (
  name: string,
  jointDeclaration: typeof manifesto | null = null,
): StatementWithAuthorAndSubject =>
  ({
    statement: { id: `${name}:${jointDeclaration?.id ?? 'own'}`, jointDeclaration },
    author: figure(name),
  }) as unknown as StatementWithAuthorAndSubject

const gather = (
  feed: StatementWithAuthorAndSubject[],
  signatories: Map<string, StatementAuthorRef[]> = new Map(),
  limit = 5,
) => gatherSignatures(feed, signatureOfFeedEntry, signatories, limit)

const names = (authors: { name: string }[]) => authors.map(({ name }) => name)

describe('gatherSignatures', () => {
  it('keeps a statement of an author’s own as it is', () => {
    const own = entry('Alma')

    expect(gather([own])).toEqual([{ kind: 'statement', entry: own }])
  })

  it('gathers the signatures of one text into one entry, where the first of them stood', () => {
    const first = entry('Alma', manifesto)
    const feed = [first, entry('Boris'), entry('Chloé', manifesto), entry('David', manifesto)]

    const [signed, own, ...rest] = gather(feed)

    expect(signed).toMatchObject({ kind: 'signatures', declaration: manifesto, first, others: 0 })
    expect(signed.kind === 'signatures' && names(signed.named)).toEqual(['Alma', 'Chloé', 'David'])
    expect(own).toMatchObject({ kind: 'statement' })
    expect(rest).toEqual([])
  })

  it('names the first of all who signed the text, in the order they are given, and counts the others', () => {
    // The feed only read the last signature; the text has five signatories, the most documented first
    const everyone = ['Emma', 'David', 'Chloé', 'Boris', 'Alma'].map(figure)

    const [signed] = gather([entry('Alma', manifesto)], new Map([['manifesto', everyone]]))

    expect(signed.kind === 'signatures' && names(signed.named)).toEqual(['Emma', 'David', 'Chloé'])
    expect(signed).toMatchObject({ others: everyone.length - NAMED_SIGNATORIES })
  })

  it('names those it read when the signatories of a text are not given', () => {
    const feed = ['Alma', 'Boris', 'Chloé', 'David', 'Emma'].map((name) => entry(name, manifesto))

    const [signed] = gather(feed)

    expect(signed.kind === 'signatures' && names(signed.named)).toEqual(['Alma', 'Boris', 'Chloé'])
    expect(signed).toMatchObject({ others: 2 })
  })

  it('keeps two texts apart', () => {
    const feed = [entry('Alma', manifesto), entry('Boris', appeal), entry('Chloé', manifesto)]

    expect(gather(feed).map((e) => e.kind === 'signatures' && e.declaration.id)).toEqual([
      'manifesto',
      'appeal',
    ])
  })

  it('shows no more entries than asked, a gathered text counting for one', () => {
    const feed = [
      ...['Alma', 'Boris', 'Chloé'].map((name) => entry(name, manifesto)),
      entry('David'),
      entry('Emma'),
    ]

    expect(gather(feed, new Map(), 2).map(({ kind }) => kind)).toEqual(['signatures', 'statement'])
  })

  it('gathers the entries of a rail as it does those of the feed', () => {
    const signature = (name: string): LatestStatement =>
      ({ statementId: name, author: figure(name), jointDeclaration: manifesto }) as LatestStatement
    const own = { statementId: 'own', author: figure('David') } as LatestStatement

    const gathered = gatherSignatures(
      [signature('Alma'), own, signature('Boris')],
      signatureOfLatest,
      new Map(),
      5,
    )

    expect(gathered.map(({ kind }) => kind)).toEqual(['signatures', 'statement'])
  })
})

describe('declarationIdsIn', () => {
  it('lists once each text signed in the feed', () => {
    const feed = [entry('Alma', manifesto), entry('Boris'), entry('Chloé', manifesto)]

    expect(declarationIdsIn(feed, signatureOfFeedEntry)).toEqual(['manifesto'])
  })
})

describe('the sentence of a gathered entry', () => {
  /** The sentence as a page writes it, names standing for the links */
  const sentence = (named: string[], others: number) =>
    named.map((name, index) => nameSeparator(index, named.length, others) + name).join('') +
    signedTail(named.length, others)

  it('says that one signatory signed', () => {
    expect(sentence(['Alma'], 0)).toBe('Alma a signé')
  })

  it('joins two signatories', () => {
    expect(sentence(['Alma', 'Boris'], 0)).toBe('Alma et Boris ont signé')
  })

  it('joins three signatories, the last after « et »', () => {
    expect(sentence(['Alma', 'Boris', 'Chloé'], 0)).toBe('Alma, Boris et Chloé ont signé')
  })

  it('counts the others after the names', () => {
    expect(sentence(['Alma', 'Boris', 'Chloé'], 41)).toBe(
      'Alma, Boris, Chloé et 41 autres ont signé',
    )
  })

  it('counts a single other in the singular', () => {
    expect(sentence(['Alma', 'Boris', 'Chloé'], 1)).toBe('Alma, Boris, Chloé et 1 autre ont signé')
  })
})
