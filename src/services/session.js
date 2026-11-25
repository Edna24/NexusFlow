/**
 * Authenticated user / business context helpers.
 *
 * Prefer `useAuth()` from src/context/AuthContext.jsx in React components.
 * These functions remain for non-React callers.
 */
import { fetchOwnedBusiness } from './business'
import { getSupabaseConfigError, requireSupabase, supabase } from './supabase'

export async function getAuthSession() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUser() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  return data.user
}

export async function getCurrentBusinessContext() {
  if (!supabase) {
    return {
      user: null,
      business: null,
      error: getSupabaseConfigError(),
    }
  }

  const user = await getCurrentUser()
  if (!user) {
    return {
      user: null,
      business: null,
      error: 'No authenticated user. Sign in is required before resolving business context.',
    }
  }

  try {
    const business = await fetchOwnedBusiness(user.id)
    return {
      user,
      business,
      error: business
        ? null
        : 'No business found for this user (businesses.owner_id = auth.uid()).',
    }
  } catch (error) {
    return {
      user,
      business: null,
      error: error instanceof Error ? error.message : 'Unable to load business context.',
    }
  }
}
