/**
 * Compatibility re-export.
 * Prefer importing from `src/services/supabase.js`.
 */
export {
  getSupabaseConfigError,
  isSupabaseConfigured,
  requireSupabase,
  supabase,
  testSupabaseConnection,
} from '../services/supabase'
