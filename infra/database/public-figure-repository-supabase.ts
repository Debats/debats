import * as Sentry from '@sentry/nextjs'
import { Effect, Option } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { PublicFigure } from '../../domain/entities/public-figure'
import {
  DatabaseError,
  PublicFigureRepository,
} from '../../domain/repositories/public-figure-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

export function createPublicFigureRepository(supabase: SupabaseClient): PublicFigureRepository {
  return {
    findAll: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase.from('public_figures').select('*').order('name')

          if (error) throw error

          return data.map((figure) =>
            PublicFigure.make({
              id: figure.id,
              name: figure.name,
              slug: figure.slug,
              presentation: figure.presentation,
              websiteUrl: figure.website_url ? Option.some(figure.website_url) : Option.none(),
              wikipediaUrl: figure.wikipedia_url,
              createdAt: new Date(figure.created_at),
              updatedAt: new Date(figure.updated_at),
              createdBy: figure.created_by,
            }),
          )
        },
        catch: (error) => dbError('Failed to fetch public figures', error),
      }),

    searchByName: (query: string, limit = 10) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .select('*')
            .ilike('name', `%${query}%`)
            .order('name')
            .limit(limit)

          if (error) throw error

          return data.map((figure) =>
            PublicFigure.make({
              id: figure.id,
              name: figure.name,
              slug: figure.slug,
              presentation: figure.presentation,
              websiteUrl: figure.website_url ? Option.some(figure.website_url) : Option.none(),
              wikipediaUrl: figure.wikipedia_url,
              createdAt: new Date(figure.created_at),
              updatedAt: new Date(figure.updated_at),
              createdBy: figure.created_by,
            }),
          )
        },
        catch: (error) => dbError('Failed to search public figures', error),
      }),

    findBySlug: (slug: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .select('*')
            .eq('slug', slug)
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }

          return PublicFigure.make({
            id: data.id,
            name: data.name,
            slug: data.slug,
            presentation: data.presentation,
            websiteUrl: data.website_url ? Option.some(data.website_url) : Option.none(),
            wikipediaUrl: data.wikipedia_url,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.created_by,
          })
        },
        catch: (error) => dbError('Failed to fetch public figure', error),
      }),

    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .select('*')
            .eq('id', id)
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }

          return PublicFigure.make({
            id: data.id,
            name: data.name,
            slug: data.slug,
            presentation: data.presentation,
            websiteUrl: data.website_url ? Option.some(data.website_url) : Option.none(),
            wikipediaUrl: data.wikipedia_url,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.created_by,
          })
        },
        catch: (error) => dbError('Failed to fetch public figure', error),
      }),

    findByWikipediaUrl: (url: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .select('*')
            .eq('wikipedia_url', url)
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }

          return PublicFigure.make({
            id: data.id,
            name: data.name,
            slug: data.slug,
            presentation: data.presentation,
            websiteUrl: data.website_url ? Option.some(data.website_url) : Option.none(),
            wikipediaUrl: data.wikipedia_url,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.created_by,
          })
        },
        catch: (error) => dbError('Failed to fetch public figure by Wikipedia URL', error),
      }),

    create: (publicFigure: PublicFigure) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .insert({
              id: publicFigure.id,
              name: publicFigure.name,
              slug: publicFigure.slug,
              presentation: publicFigure.presentation,
              website_url: Option.isSome(publicFigure.websiteUrl)
                ? publicFigure.websiteUrl.value
                : null,
              wikipedia_url: publicFigure.wikipediaUrl,
              created_by: publicFigure.createdBy,
            })
            .select()
            .single()

          if (error) throw error

          return PublicFigure.make({
            id: data.id,
            name: data.name,
            slug: data.slug,
            presentation: data.presentation,
            websiteUrl: data.website_url ? Option.some(data.website_url) : Option.none(),
            wikipediaUrl: data.wikipedia_url,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.created_by,
          })
        },
        catch: (error) => dbError('Failed to create public figure', error),
      }),

    update: (publicFigure: PublicFigure) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .update({
              name: publicFigure.name,
              slug: publicFigure.slug,
              presentation: publicFigure.presentation,
              website_url: Option.isSome(publicFigure.websiteUrl)
                ? publicFigure.websiteUrl.value
                : null,
              wikipedia_url: publicFigure.wikipediaUrl,
            })
            .eq('id', publicFigure.id)
            .select()
            .single()

          if (error) throw error

          return PublicFigure.make({
            id: data.id,
            name: data.name,
            slug: data.slug,
            presentation: data.presentation,
            websiteUrl: data.website_url ? Option.some(data.website_url) : Option.none(),
            wikipediaUrl: data.wikipedia_url,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.created_by,
          })
        },
        catch: (error) => dbError('Failed to update public figure', error),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('public_figures').delete().eq('id', id)

          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete public figure', error),
      }),

    getStats: (publicFigureId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { count: statementsCount, error: statementsError } = await supabase
            .from('statements')
            .select('*', { count: 'exact', head: true })
            .eq('public_figure_id', publicFigureId)

          if (statementsError) throw statementsError

          const { data: subjectsData, error: subjectsError } = await supabase
            .from('statements')
            .select(
              `
            position_id,
            positions(subject_id)
          `,
            )
            .eq('public_figure_id', publicFigureId)

          if (subjectsError) throw subjectsError

          const uniqueSubjects = new Set(
            subjectsData
              .filter((s) => s.positions)
              .map((s) => (s.positions as unknown as { subject_id: string }).subject_id),
          )
          const subjectsCount = uniqueSubjects.size

          return {
            publicFigureId,
            statementsCount: statementsCount || 0,
            subjectsCount,
          }
        },
        catch: (error) => dbError('Failed to get public figure stats', error),
      }),
  }
}
