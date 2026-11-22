import { signatoriesLabel } from '../../../domain/read-models/joint-declaration'
import { StatementAuthorRef } from '../../../domain/read-models/statement-author'

/**
 * What a search engine or a shared link says of a joint declaration: what it
 * is, who signed it as far as the site knows, and that its positions are here.
 * A text nobody is recorded as signing yet is described by its positions
 * alone, rather than by a count of nothing.
 */
export function jointDeclarationDescription(
  declaration: { title: string; presentation?: string },
  signatories: readonly Pick<StatementAuthorRef, 'kind'>[],
): string {
  const what = declaration.presentation ?? declaration.title
  return signatories.length === 0
    ? `${what} — les positions que le texte prend, sur Débats.co.`
    : `${what} — ${signatoriesLabel(signatories)} sur Débats.co, et les positions que le texte prend.`
}
