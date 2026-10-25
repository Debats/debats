/**
 * The revision an edit form was rendered from, carried in its hidden
 * `revision` field. A form without it is a defect of the page, not a
 * contributor's mistake: it is thrown, not reported as a refusal.
 */
export function revisionOf(formData: FormData): number {
  const revision = Number(formData.get('revision'))
  if (!Number.isInteger(revision) || revision < 0) {
    throw new Error('The form carries no revision: the page must read currentRevision')
  }
  return revision
}
