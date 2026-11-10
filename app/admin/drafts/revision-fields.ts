import { parseStatementType } from '../../../domain/entities/statement'
import {
  FieldChange,
  FieldToRevise,
  isRevisable,
  RevisableField,
} from '../../../domain/services/draft-revision'
import { StatementContentInput } from '../../../domain/use-cases/validate-statement-fields'
import { AmendValues } from './build-amendments'

export type { AmendValues } from './build-amendments'

/** The free text fields of the form that hold a value of their own */
type TextKey = Exclude<RevisableField, 'quote' | 'document' | 'votedText' | 'deed'>
type ContentKey = Exclude<RevisableField, TextKey>

const isContentKey = (field: RevisableField): field is ContentKey =>
  field === 'quote' || field === 'document' || field === 'votedText' || field === 'deed'

/** What the admin reads above each field, which is also how the rules name it */
export const FIELD_LABELS: Record<RevisableField, string> = {
  authorName: 'Nom de l’auteur·ice',
  authorPresentation: 'Présentation de l’auteur·ice',
  authorWikipedia: 'Page Wikipédia de l’auteur·ice',
  subjectTitle: 'Titre du sujet',
  subjectPresentation: 'Présentation du sujet',
  subjectProblem: 'Problématique',
  positionTitle: 'Titre de la position',
  positionDescription: 'Description de la position',
  sourceName: 'Nom de la source',
  quote: 'Citation',
  document: 'Document programmatique',
  votedText: 'Texte soumis au vote',
  deed: 'Acte',
}

/** The id of the input that holds each field, for « Voir le champ » */
export const FIELD_INPUT_IDS: Record<RevisableField, string> = {
  authorName: 'amend-author-name',
  authorPresentation: 'amend-author-presentation',
  authorWikipedia: 'amend-author-wikipedia',
  subjectTitle: 'amend-subject-title',
  subjectPresentation: 'amend-subject-presentation',
  subjectProblem: 'amend-subject-problem',
  positionTitle: 'amend-position-title',
  positionDescription: 'amend-position-description',
  sourceName: 'amend-source',
  quote: 'quote',
  document: 'document',
  votedText: 'votedText',
  deed: 'deed',
}

/** The content fields the chosen nature renders: the others hold nothing the form shows */
const contentKeysOf = (content: StatementContentInput): ContentKey[] => {
  switch (parseStatementType(content.statementType)) {
    case 'declaration':
      return ['quote']
    case 'program':
      return ['document', 'quote']
    case 'vote':
      return ['votedText']
    case 'act':
      return ['deed']
  }
}

/** The words the source should carry, when the statement has words */
export const quoteOf = (content: StatementContentInput): string | undefined =>
  contentKeysOf(content).includes('quote') ? content.quote : undefined

export const valueOf = (values: AmendValues, field: RevisableField): string =>
  isContentKey(field) ? values.content[field] : values[field]

/**
 * The form as the assistant reads it: every field being written, in the
 * order the form shows them. An entity chosen among the existing is not being
 * written: its fields are left out, and the choice goes as catalogue.
 */
export function fieldsToRevise(values: AmendValues): FieldToRevise[] {
  const keys: RevisableField[] = [
    ...(values.authorMode === 'new'
      ? (['authorName', 'authorPresentation', 'authorWikipedia'] as const)
      : []),
    ...(values.subjectMode === 'new'
      ? (['subjectTitle', 'subjectPresentation', 'subjectProblem'] as const)
      : []),
    ...(values.positionMode === 'new' ? (['positionTitle', 'positionDescription'] as const) : []),
    'sourceName',
    ...contentKeysOf(values.content),
  ]
  return keys.map((field) => ({ field, label: FIELD_LABELS[field], value: valueOf(values, field) }))
}

/** What the form knows of the entities the assistant may attach to: their names, by id */
export interface Attachable {
  subjects: readonly { id: string; title: string }[]
  positions: readonly { id: string; title: string }[]
}

/** What the assistant wrote over, kept to be undone: the field and what it held */
export type Revised = Partial<Record<RevisableField, string>>

export interface Applied {
  values: AmendValues
  /** The text fields the assistant changed this time, with what they held */
  revised: Revised
}

/**
 * The form after the assistant's changes. A text field takes the new text
 * and remembers the old one; an attachment to an existing subject or
 * position switches the form to that entity, as a person would by choosing
 * it, and nothing is remembered for it: undoing an attachment is choosing again.
 */
export function applyChanges(
  values: AmendValues,
  changes: readonly FieldChange[],
  attachable: Attachable,
): Applied {
  return changes.reduce<Applied>(
    (applied, { field, value }) => {
      if (field === 'existingSubject') {
        const subject = attachable.subjects.find((s) => s.id === value)
        if (!subject) return applied
        return {
          ...applied,
          values: {
            ...applied.values,
            subjectMode: 'existing',
            subjectId: subject.id,
            subjectTitle: subject.title,
            positionMode: 'new',
            selectedPositionId: '',
          },
        }
      }
      if (field === 'existingPosition') {
        const position = attachable.positions.find((p) => p.id === value)
        if (!position) return applied
        return {
          ...applied,
          values: { ...applied.values, positionMode: 'existing', selectedPositionId: position.id },
        }
      }
      if (!isRevisable(field) || valueOf(applied.values, field) === value) return applied
      return {
        values: withValue(applied.values, field, value),
        revised: { ...applied.revised, [field]: valueOf(applied.values, field) },
      }
    },
    { values, revised: {} },
  )
}

export const withValue = (
  values: AmendValues,
  field: RevisableField,
  value: string,
): AmendValues =>
  isContentKey(field)
    ? { ...values, content: { ...values.content, [field]: value } }
    : { ...values, [field]: value }
