import { Encoded, formShape, optionalFile, positiveInt, text, texts } from './form-shape'

/**
 * What the forms of a public figure carry. The creation form and the edit form
 * share these fields; the edit form adds the revision it was rendered from.
 */
const publicFigureFields = {
  name: text,
  presentation: text,
  wikipediaUrl: text,
  websiteUrl: text,
  notorietySources: texts,
  photo: optionalFile,
}

const editPublicFigureFields = { ...publicFigureFields, revision: positiveInt }

export const newPublicFigureForm = formShape(publicFigureFields)

export const editPublicFigureForm = formShape(editPublicFigureFields)

/** What each action accepts: a form its own shape wrote, and no other. */
export type NewPublicFigureFormData = Encoded<typeof publicFigureFields>
export type EditPublicFigureFormData = Encoded<typeof editPublicFigureFields>
