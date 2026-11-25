/**
 * Shared Supabase browser client for NexusFlow.
 *
 * Credentials come from Vite env only (never hardcode secrets).
 * Use the publishable (anon) key — never the service-role key.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Returns a human-readable configuration error, or null when credentials exist.
 */
export function getSupabaseConfigError() {
  const missing = []

  if (!supabaseUrl || String(supabaseUrl).trim() === '') {
    missing.push('VITE_SUPABASE_URL')
  }

  if (!supabasePublishableKey || String(supabasePublishableKey).trim() === '') {
    missing.push('VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  if (missing.length === 0) return null

  return (
    `Supabase is not configured. Missing ${missing.join(' and ')} in the project root .env file. ` +
    'Restart the Vite dev server after adding them. Never place a service-role key in the frontend.'
  )
}

export const isSupabaseConfigured = getSupabaseConfigError() === null

function createSupabaseClient() {
  const configError = getSupabaseConfigError()

  if (configError) {
    console.error(`[NexusFlow] ${configError}`)
    return null
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

/** Shared client instance, or null when credentials are missing. */
export const supabase = createSupabaseClient()

/**
 * Returns the configured client or throws a clear configuration error.
 */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(getSupabaseConfigError())
  }
  return supabase
}

/**
 * Lightweight reachability check against the Auth health endpoint.
 * Does not require a signed-in user and does not query business tables.
 */
export async function testSupabaseConnection() {
  const configError = getSupabaseConfigError()
  if (configError) {
    return { ok: false, stage: 'config', message: configError }
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
      },
    })

    if (!response.ok) {
      return {
        ok: false,
        stage: 'network',
        message: `Supabase auth health check failed with HTTP ${response.status}.`,
      }
    }

    return {
      ok: true,
      stage: 'connected',
      message: 'Supabase project is reachable with the configured publishable credentials.',
    }
  } catch (error) {
    return {
      ok: false,
      stage: 'network',
      message:
        error instanceof Error
          ? error.message
          : 'Unable to reach the Supabase project.',
    }
  }
}
