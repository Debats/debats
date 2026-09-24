import { MetadataRoute } from 'next'
import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../infra/supabase/admin'
import { createSubjectRepository } from '../infra/database/subject-repository-supabase'
import { createPublicFigureRepository } from '../infra/database/public-figure-repository-supabase'
import { createThemeRepository } from '../infra/database/theme-repository-supabase'
import { createOrganisationRepository } from '../infra/database/organisation-repository-supabase'

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
      url: `${BASE_URL}/o`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/themes`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/themes/autres`,
      changeFrequency: 'weekly',
      priority: 0.6,
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
    const themeRepo = createThemeRepository(supabase)
    const organisationRepo = createOrganisationRepository(supabase)

    const [subjects, publicFigures, themes, organisations] = await Promise.all([
      Effect.runPromise(subjectRepo.findAll()),
      Effect.runPromise(publicFigureRepo.findAll()),
      Effect.runPromise(themeRepo.findAll()),
      Effect.runPromise(organisationRepo.findAll()),
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

    const themePages: MetadataRoute.Sitemap = themes.map((theme) => ({
      url: `${BASE_URL}/themes/${theme.slug}`,
      lastModified: theme.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    const organisationPages: MetadataRoute.Sitemap = organisations.map((organisation) => ({
      url: `${BASE_URL}/o/${organisation.slug}`,
      lastModified: organisation.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [
      ...staticPages,
      ...subjectPages,
      ...publicFigurePages,
      ...organisationPages,
      ...themePages,
    ]
  } catch (error) {
    Sentry.captureException(error, { extra: { context: 'sitemap generation' } })
    return staticPages
  }
}
