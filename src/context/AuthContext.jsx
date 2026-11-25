import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { fetchOwnedBusiness } from '../services/business'
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  requireSupabase,
  supabase,
} from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [businessLoading, setBusinessLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadBusiness = useCallback(async (nextUser) => {
    if (!nextUser) {
      setBusiness(null)
      return null
    }

    setBusinessLoading(true)
    setError(null)

    try {
      const ownedBusiness = await fetchOwnedBusiness(nextUser.id)
      setBusiness(ownedBusiness)
      if (!ownedBusiness) {
        setError(
          'Signed in, but no business was found for this account. Owner records use businesses.owner_id = auth.uid().',
        )
      }
      return ownedBusiness
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load business context.'
      setBusiness(null)
      setError(message)
      return null
    } finally {
      setBusinessLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function bootstrap() {
      if (!isSupabaseConfigured) {
        setError(getSupabaseConfigError())
        setAuthLoading(false)
        return
      }

      try {
        const client = requireSupabase()
        const { data, error: sessionError } = await client.auth.getSession()
        if (sessionError) throw sessionError
        if (!active) return

        setSession(data.session)
        setUser(data.session?.user ?? null)
        if (data.session?.user) {
          await loadBusiness(data.session.user)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to restore session.')
      } finally {
        if (active) setAuthLoading(false)
      }
    }

    bootstrap()

    if (!supabase) {
      return () => {
        active = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        loadBusiness(nextSession.user)
      } else {
        setBusiness(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadBusiness])

  const signIn = useCallback(async (email, password) => {
    const client = requireSupabase()
    setError(null)
    const { data, error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) throw signInError
    setSession(data.session)
    setUser(data.user)
    await loadBusiness(data.user)
    return data
  }, [loadBusiness])

  const signOut = useCallback(async () => {
    const client = requireSupabase()
    const { error: signOutError } = await client.auth.signOut()
    if (signOutError) throw signOutError
    setSession(null)
    setUser(null)
    setBusiness(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      business,
      businessId: business?.id ?? null,
      authLoading,
      businessLoading,
      loading: authLoading || businessLoading,
      error,
      isAuthenticated: Boolean(user),
      signIn,
      signOut,
      refreshBusiness: () => loadBusiness(user),
    }),
    [
      session,
      user,
      business,
      authLoading,
      businessLoading,
      error,
      signIn,
      signOut,
      loadBusiness,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
