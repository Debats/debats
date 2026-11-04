import { Encoded, formShape, optionalFile, positiveInt, text, texts, ValuesOf } from './form-shape'

/** What the forms of an organisation carry; the edit form adds its revision. */
const organisationFields = {
  name: text,
  acronym: text,
  organisationType: text,
  presentation: text,
  wikipediaUrl: text,
  websiteUrl: text,
  notorietySources: texts,
  logo: optionalFile,
}

const editOrganisationFields = { ...organisationFields, revision: positiveInt }

export const newOrganisationForm = formShape(organisationFields)

export const editOrganisationForm = formShape(editOrganisationFields)

/** What the shared form hands its caller, which encodes it for its own action. */
export type OrganisationFormInput = ValuesOf<typeof organisationFields>

/** What each action accepts: a form its own shape wrote, and no other. */
export type NewOrganisationFormData = Encoded<typeof organisationFields>
export type EditOrganisationFormData = Encoded<typeof editOrganisationFields>
