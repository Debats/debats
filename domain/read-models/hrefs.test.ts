import { describe, expect, it } from 'vitest'
import { positionHref } from './hrefs'

describe('positionHref', () => {
  it('is the slug of the position under the slug of its subject', () => {
    expect(positionHref('le-smic', 'augmenter')).toBe('/s/le-smic/position/augmenter')
  })
})
