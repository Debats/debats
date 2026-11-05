import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SHADES, shadeOf } from './shades'

/**
 * La feuille porte les nuances, ce module porte leur nombre : ce test tient
 * les deux ensemble. Sans lui, retirer une nuance de la feuille donnerait
 * une classe absente et un segment transparent, sans rien casser.
 */
describe('shades', () => {
  it('knows exactly as many shades as the stylesheet defines', () => {
    const stylesheet = readFileSync(
      new URL('../../styles/analysis.module.css', import.meta.url),
      'utf8',
    )
    const defined = stylesheet.match(/^\.shade\d+ \{$/gm) ?? []

    expect(defined).toHaveLength(SHADES)
  })

  it('names a class for every rank of the palette', () => {
    const named = Array.from({ length: SHADES }, (_, index) => shadeOf(index))

    expect(new Set(named).size).toBe(SHADES)
  })

  it('falls back on the last shade beyond the palette, where everything would blend', () => {
    expect(shadeOf(SHADES)).toBe(shadeOf(SHADES - 1))
    expect(shadeOf(99)).toBe(shadeOf(SHADES - 1))
  })
})
