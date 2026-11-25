import { JointDeclarationRef } from '../entities/joint-declaration'
import { StatementWithAuthorAndSubject } from '../repositories/statement-repository'
import { StatementAuthorKind } from '../entities/statement'
import { plural } from '../../lib/plural'
import { StatementAuthorRef } from './statement-author'
import { FeedOrder } from './statement-feed'

/**
 * The feed of the site, entry by entry: what the rails of the last statements
 * and the page of the feed all list. An entry is not always one statement:
 *
 * - the signatures of one joint declaration make one entry — « Alma, Boris,
 *   Chloé et 41 autres ont signé » —, whatever the number of signatories;
 * - what one author said or did the same day makes one entry — « Alma a pris
 *   position pour A et B ».
 *
 * The database gathers and pages the entries (`get_feed_entries`); this
 * module says what an entry is and how its sentence is written.
 */

/**
 * How the feed is ranked: by the day stated or by the last touch, as its page
 * offers, or by the day a statement was added to the site. An entry stands
 * where the latest of its statements does.
 */
export type FeedRanking = FeedOrder | 'added'

/** How many signatories a gathered entry names before counting the others */
export const NAMED_SIGNATORIES = 3

export type FeedEntry =
  /** One statement of an author's own */
  | { kind: 'statement'; entry: StatementWithAuthorAndSubject }
  /** What one author said or did the same day, in the order of the feed */
  | { kind: 'sameDay'; author: StatementAuthorRef; entries: StatementWithAuthorAndSubject[] }
  /** The signatures of one joint declaration */
  | {
      kind: 'signatures'
      declaration: JointDeclarationRef
      /** One of the signatures: it bears the day and the source of the text */
      first: StatementWithAuthorAndSubject
      /** The signatories the entry names: the most documented on the site first */
      named: StatementAuthorRef[]
      /** How many more signed the text */
      others: number
    }

/** A page of the feed */
export interface FeedEntriesPage {
  entries: FeedEntry[]
  /** How many entries the feed holds, narrowed as it was asked */
  total: number
  /** How many statements those entries gather */
  statements: number
}

/** An entry as the database lists it, before its statements are read */
export interface ListedEntry {
  /** The joint declaration whose signatures the entry gathers; null for statements of an author's own */
  declarationId: string | null
  /** The statements to read for it, in the order of the feed: one stands for all the signatures of a text */
  statementIds: string[]
  /** How many statements the entry gathers */
  size: number
}

/**
 * The entries of a page, from what the database listed and the statements
 * that were read for them. `signatories` gives everyone who signed each text,
 * in the order to name them; in a feed narrowed to one kind of author, only
 * the signatories of that kind are named.
 */
export function feedEntriesOf(
  listed: readonly ListedEntry[],
  statements: readonly StatementWithAuthorAndSubject[],
  signatories: ReadonlyMap<string, readonly StatementAuthorRef[]>,
  authorKind?: StatementAuthorKind,
): FeedEntry[] {
  const byId = new Map<string, StatementWithAuthorAndSubject>(
    statements.map((entry) => [entry.statement.id, entry]),
  )

  return listed.flatMap(({ declarationId, statementIds, size }): FeedEntry[] => {
    const read = statementIds.flatMap((id) => byId.get(id) ?? [])
    const [first] = read
    if (!first) return []

    const declaration = first.statement.jointDeclaration
    if (declarationId && declaration) {
      const everyone = (signatories.get(declarationId) ?? [first.author]).filter(
        (author) => !authorKind || author.kind === authorKind,
      )
      // Never more names than signatures listed: a signatory may hold no statement the feed lists
      const named = everyone.slice(0, Math.min(NAMED_SIGNATORIES, size))
      return [{ kind: 'signatures', declaration, first, named, others: size - named.length }]
    }
    return read.length === 1
      ? [{ kind: 'statement', entry: first }]
      : [{ kind: 'sameDay', author: first.author, entries: read }]
  })
}

/**
 * The statement that stands for an entry: the first it gathers. It dates the
 * entry, and its id names it among the entries of a page.
 */
export const leadOf = (entry: FeedEntry): StatementWithAuthorAndSubject => {
  if (entry.kind === 'statement') return entry.entry
  return entry.kind === 'sameDay' ? entry.entries[0] : entry.first
}

/** The statements these entries show whole, each with its source: not the signatures of a text */
export const statementsOf = (entries: readonly FeedEntry[]): StatementWithAuthorAndSubject[] =>
  entries.flatMap((entry) => {
    if (entry.kind === 'statement') return [entry.entry]
    return entry.kind === 'sameDay' ? entry.entries : []
  })

/** What comes before the item at `index` in a list of `count`: nothing, a comma, or « et » before the last */
export const listSeparator = (index: number, count: number): string => {
  if (index === 0) return ''
  return index === count - 1 ? ' et ' : ', '
}

/**
 * What comes before the name at `index` among the `named` signatories of a
 * text: as in any list, but the last name takes a comma too when others are
 * counted after it.
 */
export const nameSeparator = (index: number, named: number, others: number): string =>
  listSeparator(index, others === 0 ? named : named + 1)

/** What follows the names: « et 41 autres ont signé », « a signé » */
export const signedTail = (named: number, others: number): string =>
  `${others > 0 ? ` et ${others} ${plural(others, 'autre', 'autres')}` : ''} ${plural(named + others, 'a signé', 'ont signé')}`
