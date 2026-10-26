/**
 * The revision an edit form was rendered from, carried in its hidden
 * `revision` field. A form without it is a defect of the page, not a
 * contributor's mistake: it is thrown, not reported as a refusal.
 */
export function revisionOf(formData: FormData): number {
  const field = formData.get('revision')
  // Number(null) and Number('') are 0: an absent field must not pass as revision 0
  if (typeof field !== 'string' || !/^\d+$/.test(field)) {
    throw new Error('The form carries no revision: the page must read currentRevision')
  }
  return Number(field)
}
