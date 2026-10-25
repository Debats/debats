import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  Invitation,
  InvitationId,
  InviteeEmail,
  InviteeName,
  InvitationStatus,
} from '../../domain/entities/invitation'
import { InvitationRepository } from '../../domain/repositories/invitation-repository'
import { DatabaseError } from '../../domain/repositories/errors'
import { Database } from '../../types/database.types'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

type InvitationRow = Database['public']['Tables']['invitations']['Row']

const mapRowToEntity = (row: InvitationRow): Invitation =>
  Invitation.make({
    id: InvitationId.make(row.id),
    inviterId: row.inviter_id,
    inviteeEmail: InviteeEmail.make(row.invitee_email),
    inviteeName: InviteeName.make(row.invitee_name),
    inviteeId: row.invitee_id ?? undefined,
    status: row.status as InvitationStatus,
    createdAt: new Date(row.created_at!),
    updatedAt: new Date(row.updated_at!),
  })

export function createInvitationRepository(supabase: SupabaseClient): InvitationRepository {
  return {
    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('id', id)
            .maybeSingle()

          if (error) throw error
          return data ? mapRowToEntity(data) : null
        },
        catch: (error) => dbError('Failed to find invitation by id', error),
      }),

    findPendingByEmail: (email: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('invitee_email', email)
            .eq('status', 'pending')
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }
          return mapRowToEntity(data)
        },
        catch: (error) => dbError('Failed to find pending invitation by email', error),
      }),

    findPendingByInviter: (inviterId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('inviter_id', inviterId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

          if (error) throw error
          return data.map(mapRowToEntity)
        },
        catch: (error) => dbError('Failed to find pending invitations by inviter', error),
      }),
  }
}
