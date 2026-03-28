import { MetadataRoute } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../infra/supabase/admin'
import { createSubjectRepository } from '../infra/database/subject-repository-supabase'
import { createPublicFigureRepository } from '../infra/database/public-figure-repository-supabase'

const BASE_URL = 'https://debats.co'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/s`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/p`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/a-propos`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/guide`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/mentions-legales`,
      changeFrequency: 'yearly',
      priority: 0.1,
    },
    {
      url: `${BASE_URL}/credits`,
      changeFrequency: 'yearly',
      priority: 0.1,
    },
  ]

  try {
    const supabase = createAdminSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const publicFigureRepo = createPublicFigureRepository(supabase)

    const [subjects, publicFigures] = await Promise.all([
      Effect.runPromise(subjectRepo.findAll()),
      Effect.runPromise(publicFigureRepo.findAll()),
    ])

    const subjectPages: MetadataRoute.Sitemap = subjects.map((subject) => ({
      url: `${BASE_URL}/s/${subject.slug}`,
      lastModified: subject.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    const publicFigurePages: MetadataRoute.Sitemap = publicFigures.map((figure) => ({
      url: `${BASE_URL}/p/${figure.slug}`,
      lastModified: figure.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...subjectPages, ...publicFigurePages]
  } catch {
    // If DB is unavailable, return static pages only
    return staticPages
  }
}
