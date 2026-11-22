import { notFound, permanentRedirect } from 'next/navigation'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Subject } from '../../domain/entities/subject'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { findSubjectSuccessorSlug } from '../../infra/queries/subject-successor'
import { Database } from '../../types/database.types'

/**
 * The subject a page is about, or no return at all. When the subject at
 * `slug` was merged into another, the visitor is sent for good to the same
 * page of the subject that took it in (`hrefOfSuccessor`), so that the links
 * to the old address keep working; when there never was one, or it was
 * simply deleted, the page answers 404.
 */
export async function subjectAt(
  supabase: SupabaseClient<Database>,
  slug: string,
  hrefOfSuccessor: (successorSlug: string) => string,
): Promise<Subject> {
  const subject = await Effect.runPromise(createSubjectRepository(supabase).findBySlug(slug))
  if (subject) return subject

  const successor = await Effect.runPromise(findSubjectSuccessorSlug(supabase, slug))
  if (successor) permanentRedirect(hrefOfSuccessor(successor))
  notFound()
}
