/**
 * The shape of a form that carries a file: the fields it holds, described once
 * and shared by the client that sends it and by the server action that reads it.
 *
 * A form of plain values needs nothing of this: it travels as a typed argument
 * of its own action, and the type of that argument is the whole contract. A form
 * that carries a file has no such choice — a `File` is not a serializable
 * argument of a Server Function, so it travels in a `FormData`, which knows
 * nothing of its own fields.
 *
 * Such a form used to be assembled by hand on one side and parsed by hand on the
 * other, two lists kept in step by attention alone. A field forgotten on the way
 * out was read as empty on the way in, in silence — that is how the edit form of
 * a public figure lost the revision it was rendered from. Here a shape writes and
 * reads the same keys: what `encode` demands is what `decode` hands back, and the
 * compiler holds the list.
 */

/** Writes one value into a FormData, and reads it back. */
interface FormField<T> {
  // Method syntax on purpose: a FormField<string> must pass where the shape
  // holds a FormField<unknown>, which property syntax would forbid.
  write(form: FormData, key: string, value: T): void
  read(form: FormData, key: string): T
}

type Fields = Record<string, FormField<unknown>>

/** The values a shape carries: one per field, of the type that field reads. */
export type ValuesOf<F extends Fields> = {
  [K in keyof F]: F[K] extends FormField<infer T> ? T : never
}

declare const encodedBy: unique symbol

/**
 * A FormData a given shape wrote.
 *
 * The mark is never written: no value carries it, nothing reads it. It only
 * holds an action to the fields it decodes, so that a form encoded by the
 * creation shape cannot reach the action that reads the edit shape — which
 * would be the same field forgotten, one floor up. What truly arrives on the
 * wire is whatever a browser sent: every field reads defensively.
 */
export interface Encoded<F extends Fields> extends FormData {
  readonly [encodedBy]: F
}

interface FormShape<F extends Fields> {
  /** The FormData to send: every field of the shape, none forgotten. */
  encode(values: ValuesOf<F>): Encoded<F>
  /** What the form carries, read as the shape describes it. */
  decode(form: Encoded<F>): ValuesOf<F>
}

/**
 * A line of text, without the spaces around it: a name typed with a stray
 * space reads the same as without it, and a field holding nothing but spaces
 * holds nothing. A form that does not carry the field, or that carries
 * something that is not text, reads as empty: what reaches an action comes
 * from a browser we do not hold.
 */
export const text: FormField<string> = {
  write: (form, key, value) => form.set(key, value.trim()),
  read: (form, key) => {
    const field = form.get(key)
    return typeof field === 'string' ? field.trim() : ''
  },
}

const meaningful = (values: readonly string[]) =>
  values.map((value) => value.trim()).filter((value) => value.length > 0)

/** Several lines of text under one key; blank ones are dropped, the rest trimmed. */
export const texts: FormField<string[]> = {
  write: (form, key, values) => meaningful(values).forEach((value) => form.append(key, value)),
  read: (form, key) => meaningful(form.getAll(key).filter((value) => typeof value === 'string')),
}

const WHOLE_ABOVE_ZERO = /^[1-9]\d*$/

/**
 * A whole number above zero, such as the revision a form was rendered from.
 * A form that does not carry it is a defect of the page, not a contributor's
 * mistake: it is thrown, not reported as a refusal.
 */
export const positiveInt: FormField<number> = {
  write: (form, key, value) => form.set(key, String(value)),
  read: (form, key) => {
    const field = form.get(key)
    if (typeof field !== 'string' || !WHOLE_ABOVE_ZERO.test(field)) {
      throw new Error(`The form carries no "${key}": a whole number above zero was expected`)
    }
    return Number(field)
  },
}

/**
 * A file the contributor may or may not have chosen. An untouched file input
 * still sends an empty file: that is no file at all.
 */
export const optionalFile: FormField<File | undefined> = {
  write: (form, key, value) => {
    if (value) form.set(key, value)
  },
  read: (form, key) => {
    const field = form.get(key)
    return field instanceof File && field.size > 0 ? field : undefined
  },
}

/** Describes a form by its fields; hands back the pair that writes and reads it. */
export function formShape<F extends Fields>(fields: F): FormShape<F> {
  // Object.entries widens the keys to string: the shape knows better
  const described = Object.entries(fields) as [keyof F & string, FormField<unknown>][]

  return {
    encode: (values) => {
      const form = new FormData()
      described.forEach(([key, field]) => field.write(form, key, values[key]))
      // The mark says where the form comes from; it is a claim, not a value to write
      return form as Encoded<F>
    },
    // fromEntries loses the mapping between a key and the type its field reads
    decode: (form) =>
      Object.fromEntries(
        described.map(([key, field]) => [key, field.read(form, key)]),
      ) as ValuesOf<F>,
  }
}
