import { describe, it, expect } from 'vitest'
import { createTheme } from './theme'

describe('Theme Entity', () => {
  describe('createTheme', () => {
    it('should create a valid theme with generated slug', () => {
      const theme = createTheme({
        name: 'Économie',
        description: 'Fiscalité, emploi, finances publiques, marché du travail',
        createdBy: 'user-123',
      })

      expect(theme.name).toBe('Économie')
      expect(theme.slug).toBe('economie')
      expect(theme.description).toBe('Fiscalité, emploi, finances publiques, marché du travail')
      expect(theme.id).toBeTruthy()
      expect(theme.createdBy).toBe('user-123')
      expect(theme.updatedBy).toBe('user-123')
      expect(theme.createdAt).toBeInstanceOf(Date)
      expect(theme.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle accents and special characters in slug', () => {
      const theme = createTheme({
        name: 'Éducation & Recherche',
        description: 'Système scolaire, universités, recherche scientifique',
        createdBy: 'user-123',
      })

      expect(theme.slug).toBe('education-recherche')
    })

    it('should reject a name shorter than 2 characters', () => {
      expect(() =>
        createTheme({ name: 'A', description: 'Une description', createdBy: 'user-123' }),
      ).toThrow()
    })

    it('should reject a name longer than 50 characters', () => {
      expect(() =>
        createTheme({
          name: 'A'.repeat(51),
          description: 'Une description',
          createdBy: 'user-123',
        }),
      ).toThrow()
    })
  })
})
