import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const { toast } = useToast()
  
  // Activity tracking for session management
  const lastActivityRef = useRef<number>(Date.now())
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds

  // Activity tracking functions
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    // Reset inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    
    // Set new inactivity timer only if user is logged in
    if (session?.user) {
      inactivityTimerRef.current = setTimeout(() => {
        const now = Date.now()
        const timeSinceLastActivity = now - lastActivityRef.current
        
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          console.log('Session expired due to inactivity')
          handleInactivityTimeout()
        }
      }, INACTIVITY_TIMEOUT)
    }
  }, [session?.user])

  const handleInactivityTimeout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setSession(null)
      
      toast({
        title: "Sessão expirada",
        description: "Sua sessão foi encerrada por inatividade. Faça login novamente.",
        variant: "destructive"
      })
    } catch (error) {
      console.error('Error during inactivity timeout:', error)
    }
  }, [toast])

  useEffect(() => {
    let isMounted = true

    const applySession = (session: Session | null) => {
      if (!isMounted) return
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        // Start activity tracking
        updateActivity()
        
        // Defer Supabase calls to avoid deadlocks inside the auth callback
        setTimeout(() => {
          if (!isMounted) return
          fetchProfile(session.user!.id)
        }, 0)
      } else {
        setProfile(null)
        // Clear activity tracking when logged out
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current)
          inactivityTimerRef.current = null
        }
      }

      setInitialized(true)
      setLoading(false)
    }

    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session)
    })

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting initial session:', error)
          // Não force signOut em erro transitório
          if (isMounted) setLoading(false)
          return
        }
        applySession(session)
      })
      .catch((error) => {
        console.error('Error getting initial session:', error)
        // Não force signOut em erro transitório
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [])

  // Activity tracking for user interactions
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      if (session?.user) {
        updateActivity()
      }
    }
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [session?.user, updateActivity])

  // Refresh session when tab becomes active (prevents apparent expirations)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && session?.user) {
        // Check if we've been inactive for too long
        const now = Date.now()
        const timeSinceLastActivity = now - lastActivityRef.current
        
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          handleInactivityTimeout()
        } else {
          // Refresh session if still within activity window
          supabase.auth.getSession().catch(() => {})
          updateActivity()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [session?.user, handleInactivityTimeout, updateActivity])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName
        }
      }
    })

    if (error) {
      throw error
    }

    if (data.user && !data.session) {
      toast({
        title: "Verificação de email necessária",
        description: "Verifique sua caixa de entrada para confirmar seu email."
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw error
    }

    if (data.user && !data.user.email_confirmed_at) {
      throw new Error("Email não verificado. Verifique sua caixa de entrada.")
    }
  }

  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (error) {
      throw error
    }
  }

  const signOut = async () => {
    // Clear activity tracking
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
    
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      throw error
    }

    toast({
      title: "Email enviado",
      description: "Verifique sua caixa de entrada para redefinir sua senha."
    })
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error("Usuário não autenticado")

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      throw error
    }

    await fetchProfile(user.id)
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram atualizadas com sucesso."
    })
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}