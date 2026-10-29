/**
 * What the domain knows of a contributor: who she is and the reputation the
 * journal has granted her, which decides what she may do. Her name and e-mail
 * belong to authentication (`auth.users`), never to a command.
 */
export type ContributorIdentity = { id: string; reputation: number }
