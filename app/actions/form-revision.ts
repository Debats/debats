/**
 * The revision an edit form was rendered from, carried in its hidden
 * `revision` field. A form without it, or with zero, is a defect of the
 * page, not a contributor's mistake: it is thrown, not reported as a
 * refusal. A stream stands at one or more from its first event, so no page
 * renders from zero.
 */
export function revisionOf(formData: FormData): number {
  const field = formData.get('revision')
  if (typeof field !== 'string' || !/^[1-9]\d*$/.test(field)) {
    throw new Error('The form carries no revision: the page must read currentRevision')
  }
  return Number(field)
}
