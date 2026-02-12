import { describe, it, expect } from 'vitest'
import {
  createSubject,
  isMajorSubject,
  updateSubjectTitle,
  updateSubjectPresentation,
  generateSlug,
} from './subject'

describe('Subject Entity', () => {
  describe('createSubject', () => {
    it('should create a valid subject with generated slug', () => {
      const subject = createSubject({
        title: 'Immigration en France',
        presentation: "Débat sur les politiques d'immigration française",
        problem: "Quelle approche adopter pour l'immigration ?",
      })

      expect(subject.slug).toBe('immigration-en-france')
      expect(subject.title).toBe('Immigration en France')
      expect(subject.presentation).toBe("Débat sur les politiques d'immigration française")
      expect(subject.problem).toBe("Quelle approche adopter pour l'immigration ?")
      expect(subject.id).toBeTruthy()
      expect(subject.createdAt).toBeInstanceOf(Date)
      expect(subject.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle accents and special characters in slug generation', () => {
      const subject = createSubject({
        title: 'Écologie & Développement Durable',
        presentation: 'Test presentation with minimum length',
        problem: 'Test problem with minimum length',
      })

      expect(subject.slug).toBe('ecologie-developpement-durable')
    })

    it('should include optional fields when provided', () => {
      const subject = createSubject({
        title: 'Test Subject',
        presentation: 'Test presentation with minimum length',
        problem: 'Test problem with minimum length',
        pictureUrl: 'https://example.com/image.jpg',
        createdBy: 'user-123',
      })

      expect(subject.pictureUrl).toBe('https://example.com/image.jpg')
      expect(subject.createdBy).toBe('user-123')
    })
  })

  describe('generateSlug', () => {
    it('should generate proper slugs from various inputs', () => {
      expect(generateSlug('Simple Title')).toBe('simple-title')
      expect(generateSlug('Title with Multiple    Spaces')).toBe('title-with-multiple-spaces')
      expect(generateSlug('Àccénts & Spéciàl Chärs!')).toBe('accents-special-chars')
      expect(generateSlug('123 Numbers & Symbols @#$')).toBe('123-numbers-symbols')
    })

    it('should handle edge cases', () => {
      expect(generateSlug('   Leading and trailing   ')).toBe('leading-and-trailing')
      expect(generateSlug('Multiple---Dashes')).toBe('multiple-dashes')
    })
  })

  describe('isMajorSubject', () => {
    it('should identify major subject when recent (less than a week old)', () => {
      const subject = createSubject({
        title: 'Recent Subject',
        presentation: 'Test presentation with minimum length',
        problem: 'Test problem with minimum length',
      })

      expect(isMajorSubject(subject, 0)).toBe(true)
    })

    it('should identify major subject when it has many statements', () => {
      const subject = createSubject({
        title: 'Old Subject',
        presentation: 'Test presentation with minimum length',
        problem: 'Test problem with minimum length',
      })

      const oldSubject = {
        ...subject,
        createdAt: new Date('2020-01-01'),
      }

      expect(isMajorSubject(oldSubject, 6)).toBe(true)
    })

    it('should identify minor subject when old and few statements', () => {
      const subject = createSubject({
        title: 'Old Subject',
        presentation: 'Test presentation with minimum length',
        problem: 'Test problem with minimum length',
      })

      const oldSubject = {
        ...subject,
        createdAt: new Date('2020-01-01'),
      }

      expect(isMajorSubject(oldSubject, 2)).toBe(false)
    })
  })

  describe('updateSubjectTitle', () => {
    it('should update title and slug while preserving other fields', () => {
      const original = createSubject({
        title: 'Original Title',
        presentation: 'Test presentation with minimum length',
        problem: 'Test problem with minimum length',
      })

      const updated = updateSubjectTitle(original, 'New Title')

      expect(updated.title).toBe('New Title')
      expect(updated.slug).toBe('new-title')
      expect(updated.presentation).toBe(original.presentation)
      expect(updated.problem).toBe(original.problem)
      expect(updated.id).toBe(original.id)
      expect(updated.createdAt).toBe(original.createdAt)
      expect(updated.updatedAt).not.toBe(original.updatedAt)
    })
  })

  describe('updateSubjectPresentation', () => {
    it('should update presentation while preserving other fields', () => {
      const original = createSubject({
        title: 'Test Title',
        presentation: 'Original presentation with minimum length',
        problem: 'Test problem with minimum length',
      })

      const updated = updateSubjectPresentation(original, 'New presentation with updated content')

      expect(updated.presentation).toBe('New presentation with updated content')
      expect(updated.title).toBe(original.title)
      expect(updated.slug).toBe(original.slug)
      expect(updated.id).toBe(original.id)
      expect(updated.createdAt).toBe(original.createdAt)
      expect(updated.updatedAt).not.toBe(original.updatedAt)
    })
  })
})
