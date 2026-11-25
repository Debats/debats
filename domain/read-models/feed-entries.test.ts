import { describe, it, expect } from 'vitest'
import { StatementWithAuthorAndSubject } from '../repositories/statement-repository'
import {
  feedEntriesOf,
  listSeparator,
  NAMED_SIGNATORIES,
  nameSeparator,
  signedTail,
  statementsOf,
} from './feed-entries'
import { organisationRef, publicFigureRef, StatementAuthorRef } from './statement-author'

const figure = (name: string) => publicFigureRef({ id: name, name, slug: name.toLowerCase() })
const party = (name: string) =>
  organisationRef({ id: name, name, slug: name.toLowerCase(), acronym: null })

const manifesto = { id: 'manifesto', title: 'Le Manifeste', slug: 'le-manifeste' }

/** A statement reduced to what an entry reads: its id, who, and which text she signed if any */
const statement = (
  id: string,
  author: StatementAuthorRef,
  jointDeclaration: typeof manifesto | null = null,
): StatementWithAuthorAndSubject =>
  ({ statement: { id, jointDeclaration }, author }) as unknown as StatementWithAuthorAndSubject

const alma = figure('Alma')
const names = (authors: { name: string }[]) => authors.map(({ name }) => name)

describe('feedEntriesOf', () => {
  it('makes an entry of a statement that stands alone', () => {
    const own = statement('1', alma)

    const entries = feedEntriesOf(
      [{ declarationId: null, statementIds: ['1'], size: 1 }],
      [own],
      new Map(),
    )

    expect(entries).toEqual([{ kind: 'statement', entry: own }])
  })

  it('makes one entry of what an author said or did the same day, in the order of the feed', () => {
    const first = statement('1', alma)
    const second = statement('2', alma)

    const [entry] = feedEntriesOf(
      [{ declarationId: null, statementIds: ['2', '1'], size: 2 }],
      [first, second],
      new Map(),
    )

    expect(entry).toEqual({ kind: 'sameDay', author: alma, entries: [second, first] })
  })

  it('makes one entry of the signatures of a text, naming the first of its signatories and counting the others', () => {
    const signature = statement('1', alma, manifesto)
    const everyone = ['Emma', 'David', 'Chloé', 'Boris', 'Alma'].map(figure)

    const [entry] = feedEntriesOf(
      [{ declarationId: 'manifesto', statementIds: ['1'], size: 5 }],
      [signature],
      new Map([['manifesto', everyone]]),
    )

    expect(entry).toMatchObject({ kind: 'signatures', declaration: manifesto, first: signature })
    expect(entry.kind === 'signatures' && names(entry.named)).toEqual(['Emma', 'David', 'Chloé'])
    expect(entry).toMatchObject({ others: 5 - NAMED_SIGNATORIES })
  })

  it('names only the signatories the feed is narrowed to, and counts the signatures it lists', () => {
    const signature = statement('1', party('Attac'), manifesto)
    const everyone = [figure('Emma'), party('Attac'), figure('David'), party('CGT')]

    const [entry] = feedEntriesOf(
      [{ declarationId: 'manifesto', statementIds: ['1'], size: 2 }],
      [signature],
      new Map([['manifesto', everyone]]),
      'organisation',
    )

    expect(entry.kind === 'signatures' && names(entry.named)).toEqual(['Attac', 'CGT'])
    expect(entry).toMatchObject({ others: 0 })
  })

  it('never names more signatories than the feed lists signatures', () => {
    const [entry] = feedEntriesOf(
      [{ declarationId: 'manifesto', statementIds: ['1'], size: 1 }],
      [statement('1', alma, manifesto)],
      new Map([['manifesto', [figure('Emma'), alma]]]),
    )

    expect(entry.kind === 'signatures' && entry.named).toHaveLength(1)
    expect(entry).toMatchObject({ others: 0 })
  })

  it('names who signed the statement it read when the signatories of the text are not given', () => {
    const [entry] = feedEntriesOf(
      [{ declarationId: 'manifesto', statementIds: ['1'], size: 3 }],
      [statement('1', alma, manifesto)],
      new Map(),
    )

    expect(entry.kind === 'signatures' && names(entry.named)).toEqual(['Alma'])
    expect(entry).toMatchObject({ others: 2 })
  })

  it('keeps the order of the feed, and leaves out an entry none of whose statements was read', () => {
    const one = statement('1', alma)
    const three = statement('3', figure('Boris'))

    const entries = feedEntriesOf(
      [
        { declarationId: null, statementIds: ['3'], size: 1 },
        { declarationId: null, statementIds: ['2'], size: 1 },
        { declarationId: null, statementIds: ['1'], size: 1 },
      ],
      [one, three],
      new Map(),
    )

    expect(entries.map((entry) => entry.kind === 'statement' && entry.entry)).toEqual([three, one])
  })
})

describe('statementsOf', () => {
  it('lists the statements an entry shows whole: its own, never the signatures of a text', () => {
    const own = statement('1', alma)
    const first = statement('2', alma)
    const second = statement('3', alma)
    const signature = statement('4', alma, manifesto)

    expect(
      statementsOf([
        { kind: 'statement', entry: own },
        { kind: 'sameDay', author: alma, entries: [first, second] },
        { kind: 'signatures', declaration: manifesto, first: signature, named: [alma], others: 0 },
      ]),
    ).toEqual([own, first, second])
  })
})

describe('the sentence of signatures gathered', () => {
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

describe('listSeparator', () => {
  const listed = (items: string[]) =>
    items.map((item, index) => listSeparator(index, items.length) + item).join('')

  it('joins what an author took the same day: commas, then « et » before the last', () => {
    expect(listed(['A'])).toBe('A')
    expect(listed(['A', 'B'])).toBe('A et B')
    expect(listed(['A', 'B', 'C'])).toBe('A, B et C')
  })
})
