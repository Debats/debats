/** Reads the raw organisation fields shared by the create and update forms. */
export function readOrganisationFields(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    acronym: String(formData.get('acronym') ?? '').trim(),
    organisationType: String(formData.get('organisationType') ?? ''),
    presentation: String(formData.get('presentation') ?? '').trim(),
    wikipediaUrl: String(formData.get('wikipediaUrl') ?? '').trim(),
    websiteUrl: String(formData.get('websiteUrl') ?? '').trim(),
    notorietySources: formData
      .getAll('notorietySources')
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0),
  }
}
