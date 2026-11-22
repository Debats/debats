import { describe, expect, it } from 'vitest'
import {
  EMPTY_SOURCE_WATCH,
  hintFor,
  sourceAnswered,
  sourceSettled,
  sourceTyped,
} from './source-watch'

const manifesto = { id: 'd1', title: 'Le Manifeste de Paris', slug: 'le-manifeste-de-paris' }
const A = 'https://exemple.fr/manifeste'
const B = 'https://exemple.fr/entretien'

describe('hintFor', () => {
  it('offers nothing before the site answered', () => {
    expect(hintFor(sourceTyped(EMPTY_SOURCE_WATCH, A))).toBeUndefined()
  })

  it('offers the text the address in the field is the source of', () => {
    const watch = sourceAnswered(sourceTyped(EMPTY_SOURCE_WATCH, A), A, manifesto)

    expect(hintFor(watch)).toEqual(manifesto)
  })

  it('ignores the spaces around the address', () => {
    const watch = sourceAnswered(sourceTyped(EMPTY_SOURCE_WATCH, `  ${A} `), A, manifesto)

    expect(hintFor(watch)).toEqual(manifesto)
  })

  it('offers nothing when no text bears the address', () => {
    const watch = sourceAnswered(sourceTyped(EMPTY_SOURCE_WATCH, B), B, null)

    expect(hintFor(watch)).toBeUndefined()
  })

  it('does not show a late answer about an address the field no longer holds', () => {
    // A was asked first and answers last, after the field moved on to B
    const asked = sourceTyped(sourceTyped(EMPTY_SOURCE_WATCH, A), B)
    const watch = sourceAnswered(sourceAnswered(asked, B, null), A, manifesto)

    expect(hintFor(watch)).toBeUndefined()
  })

  it('drops the hint when the field goes back to an address already asked about', () => {
    const answered = sourceAnswered(
      sourceAnswered(sourceTyped(EMPTY_SOURCE_WATCH, B), B, null),
      A,
      manifesto,
    )

    expect(hintFor(sourceTyped(answered, A))).toEqual(manifesto)
    expect(hintFor(sourceTyped(sourceTyped(answered, A), B))).toBeUndefined()
  })

  it('brings the hint back when the field comes back to the address of a text', () => {
    const watch = sourceAnswered(sourceTyped(EMPTY_SOURCE_WATCH, A), A, manifesto)

    expect(hintFor(sourceTyped(sourceTyped(watch, B), A))).toEqual(manifesto)
  })

  it('does not put the question again once the contributor answered it', () => {
    const watch = sourceSettled(sourceAnswered(sourceTyped(EMPTY_SOURCE_WATCH, A), A, manifesto))

    expect(hintFor(watch)).toBeUndefined()
    expect(hintFor(sourceTyped(sourceTyped(watch, B), A))).toBeUndefined()
  })

  it('settles one address only', () => {
    const other = { id: 'd2', title: 'Appel de Lyon', slug: 'appel-de-lyon' }
    const settled = sourceSettled(sourceAnswered(sourceTyped(EMPTY_SOURCE_WATCH, A), A, manifesto))
    const watch = sourceAnswered(sourceTyped(settled, B), B, other)

    expect(hintFor(watch)).toEqual(other)
  })
})
