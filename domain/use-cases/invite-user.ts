import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { InvitationId, InviteeEmail, InviteeName } from '../entities/invitation'
import { sendInvitation } from '../aggregates/invitation'
import { runUnitOfWork } from '../events/unit-of-work'
import { InvitationRepository } from '../repositories/invitation-repository'
import { ContributorRepository } from '../repositories/contributor-repository'
import { ContributorIdentity, Rejected } from './types'
import { openStream } from './aggregate-stream'
import { allowedTo, decoded, free } from './preconditions'
import { invitationAggregate } from './invitation-stream'
import { uniqueTakenAs } from './run-command'

const MAX_PENDING_INVITATIONS = 5
const ALREADY_INVITED = 'Cette personne a déjà été invitée.'

const InviteUserInput = S.Struct({
  email: InviteeEmail,
  name: InviteeName,
})

type InviteUserParams = {
  contributor: ContributorIdentity | null
  email: string
  name: string
}

/** Read side: the inviter's pending invitations, and whether the address is already invited */
const invitations = Effect.serviceFunctions(InvitationRepository)
const contributors = Effect.serviceFunctions(ContributorRepository)

export function inviteUserUseCase(params: InviteUserParams) {
  const { email, name } = params
  // The command names the invitation: the stream exists from its first event
  const id = InvitationId.make(crypto.randomUUID())

  const underTheQuota = (inviterId: string) =>
    Effect.filterOrFail(
      invitations.findPendingByInviter(inviterId),
      (pending) => pending.length < MAX_PENDING_INVITATIONS,
      () =>
        new Rejected(
          `Vous avez déjà ${MAX_PENDING_INVITATIONS} invitations en attente. Attendez qu'elles soient acceptées.`,
        ),
    )

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'invite_user', 'inviter'),
      input: decoded(InviteUserInput)({ email, name }),
    }),
    Effect.tap(({ input }) =>
      Effect.flatMap(
        contributors.existsByEmail(input.email),
        free('Un compte avec cette adresse courriel existe déjà.'),
      ),
    ),
    Effect.tap(({ contributor }) => underTheQuota(contributor.id)),
    Effect.tap(({ input }) =>
      Effect.flatMap(invitations.findPendingByEmail(input.email), free(ALREADY_INVITED)),
    ),
    Effect.flatMap(({ contributor, input }) =>
      runUnitOfWork((events) =>
        openStream(
          invitationAggregate,
          events,
          id,
          [sendInvitation({ inviteeEmail: input.email, inviteeName: input.name })],
          contributor.id,
        ),
      ),
    ),
    uniqueTakenAs('email', ALREADY_INVITED),
    Effect.map(({ state }) => state.invitation),
  )
}
