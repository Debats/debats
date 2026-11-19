/** An address as an image prints it: read and typed, never clicked */
export const displayAddress = (url: string): string => url.replace(/^https?:\/\//, '')

/**
 * The text that goes with the images where they are posted: the subject, its
 * question, and where the rest is read. It ends on the link: an image cannot
 * be clicked, and the networks that drop a caption's link still show its
 * address.
 */
export const shareCaption = (subject: { title: string; problem: string }, url: string): string =>
  [
    `${subject.title} : qui pense quoi ?`,
    subject.problem,
    '',
    'Des citations datées et sourcées, à lire et à compléter sur Débats.co :',
    url,
  ].join('\n')
