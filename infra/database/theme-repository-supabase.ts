import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Theme, ThemeId, ThemeName, ThemeSlug } from '../../domain/entities/theme'
import { DatabaseError } from '../../domain/repositories/errors'
import { ThemeRepository } from '../../domain/repositories/theme-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

function mapRow(data: Record<string, unknown>): Theme {
  return Theme.make({
    id: ThemeId.make(data.id as string),
    name: ThemeName.make(data.name as string),
    slug: ThemeSlug.make(data.slug as string),
    description: data.description as string,
    createdBy: data.created_by as string,
    updatedBy: data.updated_by as string,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  })
}

export function createThemeRepository(supabase: SupabaseClient): ThemeRepository {
  return {
    findAll: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase.from('themes').select('*').order('name')

          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch themes', error),
      }),

    findBySlug: (slug: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('themes')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()

          if (error) throw error
          if (!data) return null

          return mapRow(data)
        },
        catch: (error) => dbError('Failed to fetch theme by slug', error),
      }),

    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase.from('themes').select('*').eq('id', id).single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }

          return mapRow(data)
        },
        catch: (error) => dbError('Failed to fetch theme', error),
      }),

    findByIds: (ids: string[]) =>
      Effect.tryPromise({
        try: async () => {
          if (ids.length === 0) return []

          const { data, error } = await supabase
            .from('themes')
            .select('*')
            .in('id', ids)
            .order('name')

          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch themes by ids', error),
      }),

    create: (theme: Theme) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('themes')
            .insert({
              id: theme.id,
              name: theme.name,
              slug: theme.slug,
              description: theme.description,
              created_by: theme.createdBy,
              updated_by: theme.updatedBy,
            })
            .select()
            .single()

          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to create theme', error),
      }),

    update: (theme: Theme) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('themes')
            .update({
              name: theme.name,
              slug: theme.slug,
              description: theme.description,
              updated_by: theme.updatedBy,
              updated_at: new Date().toISOString(),
            })
            .eq('id', theme.id)
            .select()
            .single()

          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to update theme', error),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('themes').delete().eq('id', id)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete theme', error),
      }),

    findBySubjectId: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data: links, error: linksError } = await supabase
            .from('subject_themes')
            .select('theme_id')
            .eq('subject_id', subjectId)

          if (linksError) throw linksError
          if (links.length === 0) return []

          const themeIds = links.map((l) => l.theme_id)
          const { data, error } = await supabase
            .from('themes')
            .select('*')
            .in('id', themeIds)
            .order('name')

          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch themes for subject', error),
      }),

    assignToSubject: (subjectId: string, themeId: string, createdBy: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase
            .from('subject_themes')
            .insert({ subject_id: subjectId, theme_id: themeId, created_by: createdBy })

          if (error) throw error
        },
        catch: (error) => dbError('Failed to assign theme to subject', error),
      }),

    removeFromSubject: (subjectId: string, themeId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase
            .from('subject_themes')
            .delete()
            .eq('subject_id', subjectId)
            .eq('theme_id', themeId)

          if (error) throw error
        },
        catch: (error) => dbError('Failed to remove theme from subject', error),
      }),
  }
}
