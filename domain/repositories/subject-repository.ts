import type { Subject } from '../entities/subject'
import type { SubjectStats } from '../value-objects/subject-stats'

export interface SubjectRepository {
  findAll(): Promise<Subject[]>
  findById(id: string): Promise<Subject | null>
  findBySlug(slug: string): Promise<Subject | null>
  save(subject: Subject): Promise<Subject>
  delete(id: string): Promise<void>
  getStats(subjectId: string): Promise<SubjectStats>
}