import { Verdict as SourceVerdict } from './source-verdict'

/**
 * The revision of a draft with an assistant: what it is shown, what it may
 * answer. The assistant rewrites fields and proposes; a person applies,
 * undoes and validates. Nothing here writes anywhere.
 */

/** The fields the assistant may rewrite: the free text of the draft, by the names the admin form holds them under */
export const REVISABLE_FIELDS = [
  'authorName',
  'authorPresentation',
  'authorWikipedia',
  'subjectTitle',
  'subjectPresentation',
  'subjectProblem',
  'positionTitle',
  'positionDescription',
  'sourceName',
  'quote',
  'document',
  'votedText',
  'deed',
] as const
export type RevisableField = (typeof REVISABLE_FIELDS)[number]

/**
 * What the assistant may propose beyond text: attaching the draft to what the
 * site already has. The value is the entity's id, which the catalogue gave.
 */
export const STRUCTURAL_FIELDS = ['existingSubject', 'existingPosition'] as const
export type StructuralField = (typeof STRUCTURAL_FIELDS)[number]

export type RevisionField = RevisableField | StructuralField

export const isRevisable = (field: string): field is RevisableField =>
  (REVISABLE_FIELDS as readonly string[]).includes(field)

export const isStructural = (field: string): field is StructuralField =>
  (STRUCTURAL_FIELDS as readonly string[]).includes(field)

/** One field of the form as it stands: its name, what the admin reads above it, its text */
export interface FieldToRevise {
  field: RevisableField
  label: string
  value: string
}

/** What the site already knows of what the draft names */
export interface CatalogueFacts {
  author: { kind: 'public_figure' | 'organisation'; found: boolean }
  subject: { found: boolean; id?: string; title?: string }
  /** Subjects whose title is close to the draft's: a duplicate in the making, or the right home */
  similarSubjects: { id: string; title: string }[]
  /** The positions of the subject the form holds, when it exists */
  positions: { id: string; title: string }[]
}

/** What reading the source gave: the verdict on the words, and where they sit on the page */
export interface SourceReading {
  host: string
  verdict: SourceVerdict
  excerpt?: string
}

export interface Turn {
  role: 'user' | 'assistant'
  text: string
}

export interface RevisionRequest {
  fields: readonly FieldToRevise[]
  /** Fields a person edited by hand: not to be touched unless asked */
  locked: readonly RevisableField[]
  catalogue: CatalogueFacts
  source: SourceReading | null
  history: readonly Turn[]
  /** What the person asks now; empty for the first, automatic reading */
  request: string
}

export type AdviceVerdict = 'ok' | 'warning' | 'problem'

export interface RevisionAdvice {
  field: RevisableField
  verdict: AdviceVerdict
  note: string
}

export interface FieldChange {
  field: RevisionField
  value: string
}

/** A proposal that engages more than a field: offered, never applied by itself */
export interface Choice {
  label: string
  changes: readonly FieldChange[]
}

export interface Revision {
  reply: string
  advice: readonly RevisionAdvice[]
  changes: readonly FieldChange[]
  choices: readonly Choice[]
  /** Two or three next requests, as the person could type them */
  suggestions: readonly string[]
}

/**
 * What a revision may keep of what the assistant answered: a change on a
 * field the person locked, or on a field it was not given, has nowhere to go;
 * an attachment to an id the catalogue did not list is an invention.
 */
export function admissible(revision: Revision, request: RevisionRequest): Revision {
  const given = new Set(request.fields.map(({ field }) => field))
  const locked = new Set(request.locked)
  const known = {
    existingSubject: new Set([
      ...request.catalogue.similarSubjects.map(({ id }) => id),
      ...(request.catalogue.subject.id ? [request.catalogue.subject.id] : []),
    ]),
    existingPosition: new Set(request.catalogue.positions.map(({ id }) => id)),
  }

  const keep = ({ field, value }: FieldChange): boolean =>
    isStructural(field) ? known[field].has(value) : given.has(field) && !locked.has(field)

  return {
    ...revision,
    advice: revision.advice.filter(({ field }) => given.has(field)),
    changes: revision.changes.filter(keep),
    choices: revision.choices
      .map((choice) => ({ ...choice, changes: choice.changes.filter(keep) }))
      .filter((choice) => choice.changes.length > 0),
  }
}
