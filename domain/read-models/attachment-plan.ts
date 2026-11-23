import { isoDate } from '../aggregates/iso-date'
import { sameSource } from '../value-objects/source-address'
import { JointDeclarationPage } from './joint-declaration'

/** A statement of the author, as far as attaching one to a text needs to know it */
export interface AuthoredStatement {
  id: string
  positionId: string
  /** What it says, in a line */
  summary: string
  sourceName: string
  sourceUrl: string
  statedAt: Date
  /** The joint declaration it is already a signature of, when it is one */
  jointDeclarationId: string | null
}

/** A statement of the author that may be attached with the first one, on another position of the text */
export interface AttachmentCandidate {
  id: string
  summary: string
  sourceName: string
  /** The day it was stated, as a calendar day */
  statedAt: string
  /** It shares the source of the statement being attached: most likely the same signature */
  suggested: boolean
}

/** What attaching does on one position of the text */
export type PlannedStance = {
  positionId: string
  subjectTitle: string
  positionTitle: string
  /** The words of the text the signature will quote */
  quote: string
} & (
  | {
      /** The statement being attached stands here: it becomes the signature */
      kind: 'attached'
      /** An earlier signature of the author made a statement here: this one takes its place */
      replaces: boolean
    }
  /** An earlier signature of the author already holds this position: nothing changes */
  | { kind: 'signed' }
  /** Nobody holds it yet: a statement of the author is attached, or a new one is made */
  | { kind: 'open'; candidates: AttachmentCandidate[] }
)

/**
 * Why the statement cannot be the signature of this text: the text does not
 * take its position — not yet, whatever else it takes on the subject.
 */
export type AttachmentRefusal = 'position_not_taken'

/** What attaching a statement to a joint declaration will do, said before it is done */
export interface AttachmentPlan {
  declaration: { id: string; title: string; slug: string; sourceName: string; declaredAt: string }
  refusal?: AttachmentRefusal
  stances: PlannedStance[]
}

/**
 * Reads what attaching a statement to a text entails: signing is signing the
 * whole text, so the plan runs over every position the text takes.
 *
 * `authored` is what the same author already said on the positions of the
 * text. Their statements on the other positions are offered to be attached
 * too — a coauthor recorded once per position is one signature — and the ones
 * that share the source of the statement are suggested: they were most
 * likely recorded from the same text.
 */
export function attachmentPlanOf(
  text: JointDeclarationPage,
  statement: { id: string; positionId: string; sourceUrl: string },
  authored: readonly AuthoredStatement[],
): AttachmentPlan {
  const { declaration } = text
  const signedOn = (positionId: string) =>
    authored.some(
      (other) => other.jointDeclarationId === declaration.id && other.positionId === positionId,
    )

  const stances = text.stances.map((stance): PlannedStance => {
    const base = {
      positionId: stance.position.id,
      subjectTitle: stance.subject.title,
      positionTitle: stance.position.title,
      quote: stance.quote,
    }
    if (stance.position.id === statement.positionId) {
      return { ...base, kind: 'attached', replaces: signedOn(stance.position.id) }
    }
    if (signedOn(stance.position.id)) return { ...base, kind: 'signed' }
    return {
      ...base,
      kind: 'open',
      candidates: authored
        .filter(
          (other) =>
            other.id !== statement.id &&
            other.jointDeclarationId === null &&
            other.positionId === stance.position.id,
        )
        .map((other) => ({
          id: other.id,
          summary: other.summary,
          sourceName: other.sourceName,
          statedAt: isoDate(other.statedAt),
          suggested: sameSource(other.sourceUrl, statement.sourceUrl),
        })),
    }
  })

  return {
    declaration: {
      id: declaration.id,
      title: declaration.title,
      slug: declaration.slug,
      sourceName: declaration.sourceName,
      declaredAt: isoDate(declaration.declaredAt),
    },
    ...refusalOf(text, statement),
    stances,
  }
}

function refusalOf(
  text: JointDeclarationPage,
  statement: { positionId: string },
): { refusal?: AttachmentRefusal } {
  return text.stances.some((stance) => stance.position.id === statement.positionId)
    ? {}
    : { refusal: 'position_not_taken' }
}

/** The statements a plan attaches unless told otherwise: the one asked for, and the ones suggested, one per position */
export const suggestedAttachments = (plan: AttachmentPlan): Record<string, string> =>
  Object.fromEntries(
    plan.stances.flatMap((stance) => {
      if (stance.kind !== 'open') return []
      const suggested = stance.candidates.find((candidate) => candidate.suggested)
      return suggested ? [[stance.positionId, suggested.id]] : []
    }),
  )
