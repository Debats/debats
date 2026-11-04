import { describe, it, expect } from 'vitest'
import { formShape, text, texts, positiveInt, optionalFile } from './form-shape'

const editFigure = formShape({
  name: text,
  presentation: text,
  notorietySources: texts,
  photo: optionalFile,
  revision: positiveInt,
})

/**
 * What truly reaches an action has no type: a browser, or anyone, wrote it.
 * The mark a shape puts on what it encodes is a claim about where the form
 * comes from, and every test below is about a form that does not honour it.
 */
const asSent = <T extends FormData>(form: FormData) => form as T

const photo = () => new File(['a photograph'], 'photo.jpg', { type: 'image/jpeg' })

const values = () => ({
  name: 'Marc Endeweld',
  presentation: "Journaliste d'investigation",
  notorietySources: ['https://lemonde.fr/a', 'https://liberation.fr/b'],
  photo: photo(),
  revision: 7,
})

describe('a form shape', () => {
  it('reads back every field it wrote: nothing is lost on the way', () => {
    const sent = values()

    const read = editFigure.decode(editFigure.encode(sent))

    expect(read.name).toBe(sent.name)
    expect(read.presentation).toBe(sent.presentation)
    expect(read.notorietySources).toEqual(sent.notorietySources)
    expect(read.photo?.name).toBe('photo.jpg')
    expect(read.revision).toBe(7)
  })

  it('writes the keys a browser would send for the same fields', () => {
    const form = editFigure.encode(values())

    expect(form.get('name')).toBe('Marc Endeweld')
    expect(form.getAll('notorietySources')).toEqual([
      'https://lemonde.fr/a',
      'https://liberation.fr/b',
    ])
    expect(form.get('revision')).toBe('7')
    expect(form.get('photo')).toBeInstanceOf(File)
  })

  it('reads a field the form does not carry as empty, never as undefined', () => {
    const optional = formShape({ name: text, notorietySources: texts, photo: optionalFile })

    const read = optional.decode(asSent(new FormData()))

    expect(read.name).toBe('')
    expect(read.notorietySources).toEqual([])
    expect(read.photo).toBeUndefined()
  })
})

describe('a line of text', () => {
  const shape = formShape({ name: text })

  it('loses the spaces around it, on the way out and on the way in', () => {
    const form = shape.encode({ name: '  Marc Endeweld  ' })

    expect(form.get('name')).toBe('Marc Endeweld')
    expect(shape.decode(form).name).toBe('Marc Endeweld')
  })

  it('trims what a browser sent untrimmed', () => {
    const form = new FormData()
    form.set('name', '  Marc Endeweld ')

    expect(shape.decode(asSent(form)).name).toBe('Marc Endeweld')
  })

  it('holds nothing when it holds nothing but spaces', () => {
    const form = new FormData()
    form.set('name', '   ')

    expect(shape.decode(asSent(form)).name).toBe('')
  })
})

describe('a text list', () => {
  const shape = formShape({ sources: texts })

  it('drops what is blank and trims the rest, on the way out and on the way in', () => {
    const form = shape.encode({ sources: ['  https://a  ', '', '   '] })

    expect(form.getAll('sources')).toEqual(['https://a'])
    expect(shape.decode(form).sources).toEqual(['https://a'])
  })

  it('trims and drops what a browser sent blank', () => {
    const form = new FormData()
    form.append('sources', '  https://a  ')
    form.append('sources', '   ')

    expect(shape.decode(asSent(form)).sources).toEqual(['https://a'])
  })
})

describe('an optional file', () => {
  const shape = formShape({ photo: optionalFile })

  it('is absent from the form when there is none to send', () => {
    const form = shape.encode({ photo: undefined })

    expect(form.has('photo')).toBe(false)
    expect(shape.decode(form).photo).toBeUndefined()
  })

  it('reads the empty file of an untouched file input as none', () => {
    const form = new FormData()
    form.set('photo', new File([], ''))

    expect(shape.decode(asSent(form)).photo).toBeUndefined()
  })
})

describe('a positive whole number', () => {
  const shape = formShape({ revision: positiveInt })
  const formWith = (revision?: string) => {
    const form = new FormData()
    if (revision !== undefined) form.set('revision', revision)
    return asSent<ReturnType<typeof shape.encode>>(form)
  }

  it('reads the number the form carries', () => {
    expect(shape.decode(formWith('7')).revision).toBe(7)
    expect(shape.decode(formWith('10')).revision).toBe(10)
  })

  it('throws on a form without the field: the page forgot to send it', () => {
    expect(() => shape.decode(formWith())).toThrow('carries no "revision"')
    expect(() => shape.decode(formWith(''))).toThrow('carries no "revision"')
  })

  it('throws on zero and on a value that is not a whole number', () => {
    expect(() => shape.decode(formWith('0'))).toThrow('carries no "revision"')
    expect(() => shape.decode(formWith('007'))).toThrow('carries no "revision"')
    expect(() => shape.decode(formWith('-1'))).toThrow('carries no "revision"')
    expect(() => shape.decode(formWith('1.5'))).toThrow('carries no "revision"')
    expect(() => shape.decode(formWith('abc'))).toThrow('carries no "revision"')
  })
})

describe('a form forged by hand', () => {
  const shape = formShape({ name: text, sources: texts })

  it('cannot pass a file off as text', () => {
    const form = new FormData()
    form.set('name', new File(['a photograph'], 'photo.jpg'))
    form.append('sources', new File(['a photograph'], 'photo.jpg'))
    form.append('sources', 'https://lemonde.fr/a')

    const read = shape.decode(asSent(form))

    expect(read.name).toBe('')
    expect(read.sources).toEqual(['https://lemonde.fr/a'])
  })
})
