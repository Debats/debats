import { supabase } from './supabase'
import type { SubjectRepository } from '../../domain/repositories/subject-repository'
import type { Subject } from '../../domain/entities/subject'
import type { SubjectStats } from '../../domain/value-objects/subject-stats'
import type { Database } from '../../../types/database.types'

type SubjectRow = Database['public']['Tables']['subjects']['Row']
type SubjectInsert = Database['public']['Tables']['subjects']['Insert']

export class SupabaseSubjectRepository implements SubjectRepository {
  async findAll(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch subjects: ${error.message}`)
    }

    return data.map(this.mapRowToEntity)
  }

  async findById(id: string): Promise<Subject | null> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch subject: ${error.message}`)
    }

    return this.mapRowToEntity(data)
  }

  async findBySlug(slug: string): Promise<Subject | null> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch subject: ${error.message}`)
    }

    return this.mapRowToEntity(data)
  }

  async save(subject: Subject): Promise<Subject> {
    const row = this.mapEntityToRow(subject)

    const { data: existing } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject.id)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('subjects')
        .update(row)
        .eq('id', subject.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update subject: ${error.message}`)
      }

      return this.mapRowToEntity(data)
    } else {
      const { data, error } = await supabase
        .from('subjects')
        .insert(row)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create subject: ${error.message}`)
      }

      return this.mapRowToEntity(data)
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete subject: ${error.message}`)
    }
  }

  async getStats(subjectId: string): Promise<SubjectStats> {
    const { count: positionsCount, error: positionsError } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId)

    if (positionsError) {
      throw new Error(`Failed to count positions: ${positionsError.message}`)
    }

    const { data: publicFiguresData, error: figuresError } = await supabase
      .from('statements')
      .select(`
        public_figure_id,
        positions!inner(subject_id)
      `)
      .eq('positions.subject_id', subjectId)

    if (figuresError) {
      throw new Error(`Failed to count public figures: ${figuresError.message}`)
    }

    const uniquePublicFigures = new Set(publicFiguresData.map(s => s.public_figure_id))
    const publicFiguresCount = uniquePublicFigures.size

    const { count: statementsCount, error: statementsError } = await supabase
      .from('statements')
      .select('*, positions!inner(subject_id)', { count: 'exact', head: true })
      .eq('positions.subject_id', subjectId)

    if (statementsError) {
      throw new Error(`Failed to count statements: ${statementsError.message}`)
    }

    return {
      subjectId,
      positionsCount: positionsCount || 0,
      publicFiguresCount,
      statementsCount: statementsCount || 0
    }
  }

  private mapRowToEntity(row: SubjectRow): Subject {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      presentation: row.presentation,
      problem: row.problem,
      pictureUrl: row.picture_url || undefined,
      createdBy: row.created_by || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  private mapEntityToRow(subject: Subject): SubjectInsert {
    return {
      id: subject.id,
      title: subject.title,
      slug: subject.slug,
      presentation: subject.presentation,
      problem: subject.problem,
      picture_url: subject.pictureUrl || null,
      created_by: subject.createdBy || null,
      created_at: subject.createdAt.toISOString(),
      updated_at: subject.updatedAt.toISOString()
    }
  }
}
