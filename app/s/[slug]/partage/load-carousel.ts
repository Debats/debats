import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { getSubjectCarousel } from '../../../../infra/queries/subject-carousel'
import { CarouselSlide } from '../../../../domain/read-models/subject-carousel'

/** A subject and the slides it offers to be shared */
export interface SubjectCarousel {
  subject: { slug: string; title: string; problem: string }
  slides: CarouselSlide[]
}

/** The carousel of the subject that answers to this slug, or null when there is no such subject */
export async function loadCarousel(slug: string): Promise<SubjectCarousel | null> {
  const supabase = createAdminSupabaseClient()
  const subject = await Effect.runPromise(createSubjectRepository(supabase).findBySlug(slug))
  if (!subject) return null
  return { subject, slides: await Effect.runPromise(getSubjectCarousel(supabase, subject.id)) }
}
