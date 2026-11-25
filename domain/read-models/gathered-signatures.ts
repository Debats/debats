import { JointDeclarationRef } from '../entities/joint-declaration'
import { StatementWithAuthorAndSubject } from '../repositories/statement-repository'
import { plural } from '../../lib/plural'
import { LatestStatement } from './latest-statement'
import { StatementAuthorRef } from './statement-author'

/**
 * The last statements of the site as a rail tells them: a text many signed
 * the same day would fill it with one line per signatory, so its signatures
 * are gathered into one entry — « Alma, Boris, Chloé et 41 autres ont signé ».
 */

/** How many signatories a gathered entry names before counting the others */
export const NAMED_SIGNATORIES = 3

/**
 * How many of the site's last statements a rail reads to make its entries: a
 * text signed by dozens would otherwise leave it a single line.
 */
export const SIGNATURES_WINDOW = 100

/** What makes an entry the signature of a text: which text, and who signed */
export interface Signature {
  declaration: JointDeclarationRef
  author: StatementAuthorRef
}

/** Reads an entry as a signature, or null when it is a statement of an author's own */
export type SignatureOf<Entry> = (entry: Entry) => Signature | null

export const signatureOfFeedEntry: SignatureOf<StatementWithAuthorAndSubject> = ({
  statement,
  author,
}) => (statement.jointDeclaration ? { declaration: statement.jointDeclaration, author } : null)

export const signatureOfLatest: SignatureOf<LatestStatement> = ({ jointDeclaration, author }) =>
  jointDeclaration ? { declaration: jointDeclaration, author } : null

/** An entry of a rail, once signatures are gathered */
export type Gathered<Entry> =
  | { kind: 'statement'; entry: Entry }
  | {
      kind: 'signatures'
      declaration: JointDeclarationRef
      /** The first signature read: it bears the day and the source of the text */
      first: Entry
      /** The signatories the entry names: the most documented on the site first */
      named: StatementAuthorRef[]
      /** How many more signed the text */
      others: number
    }

/** The joint declarations signed among these entries, each once */
export const declarationIdsIn = <Entry>(
  entries: readonly Entry[],
  signatureOf: SignatureOf<Entry>,
): string[] =>
  Array.from(new Set(entries.flatMap((entry) => signatureOf(entry)?.declaration.id ?? [])))

/**
 * The first `limit` entries once the signatures of each text are gathered
 * where the first of them stood. `signatories` gives everyone who signed each
 * text, in the order to name them — the entries only hold its last
 * signatures; a text it does not give is signed by those that were read.
 */
export function gatherSignatures<Entry>(
  entries: readonly Entry[],
  signatureOf: SignatureOf<Entry>,
  signatories: ReadonlyMap<string, readonly StatementAuthorRef[]>,
  limit: number,
): Gathered<Entry>[] {
  const signedBy = new Map<string, StatementAuthorRef[]>()
  for (const entry of entries) {
    const signature = signatureOf(entry)
    if (!signature) continue
    const { id } = signature.declaration
    signedBy.set(id, [...(signedBy.get(id) ?? []), signature.author])
  }

  const gathered = new Set<string>()
  return entries
    .flatMap((entry): Gathered<Entry>[] => {
      const signature = signatureOf(entry)
      if (!signature) return [{ kind: 'statement', entry }]
      const { declaration } = signature
      if (gathered.has(declaration.id)) return []
      gathered.add(declaration.id)
      const everyone = signatories.get(declaration.id) ?? signedBy.get(declaration.id) ?? []
      const named = everyone.slice(0, NAMED_SIGNATORIES)
      return [
        {
          kind: 'signatures',
          declaration,
          first: entry,
          named,
          others: everyone.length - named.length,
        },
      ]
    })
    .slice(0, limit)
}

/**
 * What comes before the name at `index` among the `named` signatories of a
 * gathered entry: nothing, a comma, or « et » before the last name when
 * nobody else is counted after it.
 */
export const nameSeparator = (index: number, named: number, others: number): string => {
  if (index === 0) return ''
  return others === 0 && index === named - 1 ? ' et ' : ', '
}

/** What follows the names: « et 41 autres ont signé », « a signé » */
export const signedTail = (named: number, others: number): string =>
  `${others > 0 ? ` et ${others} ${plural(others, 'autre', 'autres')}` : ''} ${plural(named + others, 'a signé', 'ont signé')}`
