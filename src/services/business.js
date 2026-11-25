import { BUSINESS_COLUMNS, TABLES } from './inventory/schema'
import { requireSupabase } from './supabase'

/**
 * Load the business owned by the signed-in user.
 * Ownership rule: businesses.owner_id = auth.uid()
 */

export async function fetchOwnedBusiness(ownerId) {
  if (!ownerId) {
    console.error('[NexusFlow] Missing owner ID')
    return null
  }

  const client = requireSupabase()

  console.log('[NexusFlow] Checking business for authenticated owner')

  const { data, error } = await client
    .from(TABLES.businesses)
    .select(BUSINESS_COLUMNS.join(', '))
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (error) {
    console.error('[NexusFlow] Business query failed:', error)
    throw error
  }

  console.log('[NexusFlow] Business query result:', data)
  return data
}
