import * as S from 'effect/Schema'

export const InvitationId = S.String.pipe(S.brand('InvitationId'))
export type InvitationId = S.Schema.Type<typeof InvitationId>

export const InviteeEmail = S.String.pipe(
  S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  S.brand('InviteeEmail'),
)
export type InviteeEmail = S.Schema.Type<typeof InviteeEmail>

export const InviteeName = S.String.pipe(S.minLength(2), S.maxLength(100), S.brand('InviteeName'))
export type InviteeName = S.Schema.Type<typeof InviteeName>

export const InvitationStatus = S.Literal('pending', 'accepted', 'expired')
export type InvitationStatus = S.Schema.Type<typeof InvitationStatus>

export const Invitation = S.Struct({
  id: InvitationId,
  inviterId: S.String,
  inviteeEmail: InviteeEmail,
  inviteeName: InviteeName,
  inviteeId: S.optional(S.String),
  status: InvitationStatus,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Invitation = S.Schema.Type<typeof Invitation>

const EXPIRATION_DAYS = 7

export const createInvitation = (params: {
  inviterId: string
  inviteeEmail: string
  inviteeName: string
}): Invitation => {
  const now = new Date()

  return Invitation.make({
    id: InvitationId.make(crypto.randomUUID()),
    inviterId: params.inviterId,
    inviteeEmail: InviteeEmail.make(params.inviteeEmail),
    inviteeName: InviteeName.make(params.inviteeName),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  })
}

export const isExpired = (invitation: Invitation): boolean => {
  if (invitation.status !== 'pending') return false
  const now = new Date()
  const expiresAt = new Date(invitation.createdAt)
  expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS)
  return now > expiresAt
}
