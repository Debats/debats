'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '../infra/supabase/browser'
import { canPerform, getRank, type Action, type Rank } from '../domain/reputation/permissions'

interface CurrentUser {
  user: User
  reputation: number
  rank: Rank
  canPerform: (action: Action) => boolean
}

export function useCurrentUser(): CurrentUser | null {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setCurrentUser(null)
        return
      }

      const { data: contributor } = await supabase
        .from('contributors')
        .select('reputation')
        .eq('id', user.id)
        .single()

      const reputation = contributor?.reputation ?? 0

      setCurrentUser({
        user,
        reputation,
        rank: getRank(reputation),
        canPerform: (action: Action) => canPerform(reputation, action),
      })
    }

    fetchUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser()
      } else {
        setCurrentUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return currentUser
}
