'use server'

import { Effect, Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createJointDeclarationRepository } from '../../infra/database/joint-declaration-repository-supabase'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { runLiveForm } from '../../infra/live-services'
import { loadJointDeclarationPage } from '../../infra/queries/joint-declarations'
import { StatementAuthor } from '../../domain/entities/statement'
import {
  figureHref,
  JOINT_DECLARATIONS_HREF,
  jointDeclarationHref,
  organisationHref,
} from '../../domain/read-models/hrefs'
import { SignaturePreview, signaturePreviewOf } from '../../domain/read-models/joint-declaration'
import {
  NewJointDeclaration,
  publishJointDeclarationUseCase,
} from '../../domain/use-cases/publish-joint-declaration'
import {
  NewSignature,
  signJointDeclarationUseCase,
} from '../../domain/use-cases/sign-joint-declaration'
import {
  NewJointPosition,
  takeJointPositionUseCase,
} from '../../domain/use-cases/take-joint-position'
import { FieldErrors } from '../../domain/use-cases/types'
import { statementAuthorOf } from '../../lib/forms/statement-author'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

type Refused =
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

const refused = (failure: string | FieldErrors): Refused =>
  typeof failure === 'string'
    ? { success: false, error: failure }
    : { success: false, fieldErrors: failure }

/*
 * A Server Function receives JSON: its parameter has the type we declare,
 * never the guarantee that it arrives in that shape. The fields a schema
 * judges defend themselves; what the command walks through is brought back
 * to its shape here.
 */
const text = (value: unknown): string => (typeof value === 'string' ? value : '')

const takenPositionsOf = (value: unknown): NewJointDeclaration['positions'] =>
  Array.isArray(value)
    ? value.map((taken) => {
        const fields = taken && typeof taken === 'object' ? (taken as Record<string, unknown>) : {}
        return { positionId: text(fields.positionId), quote: text(fields.quote) }
      })
    : []

export type PublishJointDeclarationResult = { success: true; href: string } | Refused

export async function publishJointDeclarationAction(
  input: NewJointDeclaration,
): Promise<PublishJointDeclarationResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLiveForm(
    publishJointDeclarationUseCase({
      contributor,
      title: text(input.title),
      presentation: text(input.presentation),
      sourceName: text(input.sourceName),
      sourceUrl: text(input.sourceUrl),
      declaredAt: text(input.declaredAt),
      positions: takenPositionsOf(input.positions),
    }),
  )
  if (Either.isLeft(result)) return refused(result.left)

  revalidatePath(JOINT_DECLARATIONS_HREF)
  return { success: true, href: jointDeclarationHref(result.right) }
}

/** Where the signatory's own page is, to lead the contributor there once the signature is recorded */
async function signatoryHref(author: StatementAuthor): Promise<string> {
  const supabase = createAdminSupabaseClient()
  if (author.kind === 'organisation') {
    const organisation = await Effect.runPromise(
      createOrganisationRepository(supabase).findById(author.id),
    )
    return organisation ? organisationHref(organisation.slug) : ''
  }
  const figure = await Effect.runPromise(createPublicFigureRepository(supabase).findById(author.id))
  return figure ? figureHref(figure.slug) : ''
}

export type SignJointDeclarationResult =
  | { success: true; declarationHref: string; signatoryHref: string; statements: number }
  | Refused

export async function signJointDeclarationAction(
  input: NewSignature,
): Promise<SignJointDeclarationResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLiveForm(
    signJointDeclarationUseCase({
      contributor,
      declarationId: text(input.declarationId),
      author: statementAuthorOf(input.author),
    }),
  )
  if (Either.isLeft(result)) return refused(result.left)

  const { declaration, signatory, statements } = result.right
  const declarationHref = jointDeclarationHref(declaration)
  const href = await signatoryHref(signatory)
  revalidatePath(declarationHref)
  revalidatePath(JOINT_DECLARATIONS_HREF)
  if (href) revalidatePath(href)

  return { success: true, declarationHref, signatoryHref: href, statements: statements.length }
}

export type TakeJointPositionResult = { success: true; href: string } | Refused

export async function takeJointPositionAction(
  input: NewJointPosition,
): Promise<TakeJointPositionResult> {
  const contributor = await getAuthenticatedContributor()
  const result = await runLiveForm(
    takeJointPositionUseCase({
      contributor,
      declarationId: text(input.declarationId),
      positionId: text(input.positionId),
      quote: text(input.quote),
    }),
  )
  if (Either.isLeft(result)) return refused(result.left)

  const href = jointDeclarationHref(result.right)
  revalidatePath(href)
  revalidatePath(JOINT_DECLARATIONS_HREF)
  return { success: true, href }
}

/** A joint declaration as the statement form offers it to who is adding a signature */
export interface JointDeclarationOption {
  id: string
  title: string
  slug: string
}

/** The joint declarations whose title holds what was typed */
export async function searchJointDeclarations(query: string): Promise<JointDeclarationOption[]> {
  if (query.trim().length < 2) return []
  const found = await Effect.runPromise(
    createJointDeclarationRepository(createAdminSupabaseClient()).searchByTitle(query.trim()),
  )
  return found.map(({ id, title, slug }) => ({ id, title, slug }))
}

/** The joint declaration a link is the source of, if the site knows one: the statement being typed may be a signature of it */
export async function jointDeclarationFromSource(
  sourceUrl: string,
): Promise<JointDeclarationOption | null> {
  const address = sourceUrl.trim()
  if (!address) return null
  const found = await Effect.runPromise(
    createJointDeclarationRepository(createAdminSupabaseClient()).findBySourceUrl(address),
  )
  return found ? { id: found.id, title: found.title, slug: found.slug } : null
}

/** What signing this text will make, or null when no text bears the slug */
export async function previewSignature(slug: string): Promise<SignaturePreview | null> {
  const page = await Effect.runPromise(loadJointDeclarationPage(createAdminSupabaseClient(), slug))
  return page ? signaturePreviewOf(page) : null
}
