import { describe, it, expect } from 'vitest'
import { sameSource, sourceKey } from './source-address'

describe('sourceKey', () => {
  it.each([
    ['https://parismanifesto.world', 'parismanifesto.world'],
    ['https://parismanifesto.world/', 'parismanifesto.world'],
    ['http://www.ParisManifesto.world/', 'parismanifesto.world'],
    ['  https://parismanifesto.world/signataires/  ', 'parismanifesto.world/signataires'],
    ['parismanifesto.world/signataires#liste', 'parismanifesto.world/signataires'],
  ])('reads %s as %s', (url, key) => {
    expect(sourceKey(url)).toBe(key)
  })

  it('keeps the case of the path, which may name another page', () => {
    expect(sourceKey('https://example.org/Tribune')).toBe('example.org/Tribune')
  })

  it('keeps the query, which names a video', () => {
    expect(sourceKey('https://www.youtube.com/watch?v=Txj1MaTvhp0')).toBe(
      'youtube.com/watch?v=Txj1MaTvhp0',
    )
  })

  it('reads nothing from nothing', () => {
    expect(sourceKey('   ')).toBe('')
  })
})

describe('sameSource', () => {
  it('tells the same page under two spellings', () => {
    expect(sameSource('https://parismanifesto.world/', 'http://www.parismanifesto.world')).toBe(
      true,
    )
  })

  it('tells two pages of the same site apart', () => {
    expect(sameSource('https://parismanifesto.world', 'https://parismanifesto.world/en')).toBe(
      false,
    )
  })

  it('tells two videos apart', () => {
    expect(sameSource('https://youtube.com/watch?v=aaa', 'https://youtube.com/watch?v=bbb')).toBe(
      false,
    )
  })
})
