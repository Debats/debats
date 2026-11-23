import { JOINT_DECLARATION_LABEL, JointDeclarationRef } from '../entities/joint-declaration'
import { STATEMENT_TYPE_LABELS, StatementType } from '../entities/statement'
import { jointDeclarationHref } from './hrefs'

/** Where the name of a provenance leads: a page of the site, the source itself, or nowhere */
export type ProvenanceLink = { kind: 'page'; href: string } | { kind: 'source'; url: string } | null

/** Where a statement comes from, as the line under it says: what it is, and what to read it in */
export interface Provenance {
  label: string
  name: string
  link: ProvenanceLink
}

interface Sourced {
  statementType: StatementType
  sourceName: string
  sourceUrl: string | null
  jointDeclaration?: JointDeclarationRef
}

/**
 * Where a statement comes from. One of the author's own is named by its type
 * and leads to its source. The signature of a joint declaration is named as
 * such and by the title of the text, and leads to the page of the text: its
 * source, its positions and its signatories are read there.
 */
export function provenanceOf(statement: Sourced): Provenance {
  const { jointDeclaration } = statement
  if (jointDeclaration) {
    return {
      label: JOINT_DECLARATION_LABEL,
      name: jointDeclaration.title,
      link: { kind: 'page', href: jointDeclarationHref(jointDeclaration) },
    }
  }
  return {
    label: STATEMENT_TYPE_LABELS[statement.statementType],
    name: statement.sourceName,
    link: statement.sourceUrl ? { kind: 'source', url: statement.sourceUrl } : null,
  }
}

/**
 * Where a joint declaration itself comes from, for an entry that already
 * names the text and leads to its page: its source, as for any statement.
 */
export function provenanceOfText(source: { name: string; url: string }): Provenance {
  return {
    label: JOINT_DECLARATION_LABEL,
    name: source.name,
    link: { kind: 'source', url: source.url },
  }
}
