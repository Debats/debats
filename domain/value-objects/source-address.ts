/**
 * What two links to the same page have in common, however they were typed:
 * the scheme, a leading « www. », the case of the host, a trailing slash and
 * a fragment do not make another page. The path and the query do — a video
 * is named by its query — so they are kept as they are.
 *
 * Only for telling whether two links are the same: the link a page shows is
 * the one that was typed.
 */
export function sourceKey(url: string): string {
  const [, host = '', rest = ''] =
    /^(?:https?:\/\/)?(?:www\.)?([^/?#]*)([^#]*)/i.exec(url.trim()) ?? []
  return `${host.toLowerCase()}${rest.replace(/\/+$/, '')}`
}

/** Whether two links lead to the same page */
export const sameSource = (a: string, b: string): boolean => sourceKey(a) === sourceKey(b)
