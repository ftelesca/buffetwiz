import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  // Set up auth state listener FIRST
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);  // ⚠️ Store FULL session, not just user
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        // Fetch profile asynchronously (deferred with setTimeout to avoid deadlock)
        const fetchProfile = async () => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          // Update avatar from Google if needed
          const googleAvatarUrl = session.user.user_metadata?.avatar_url;
          if (googleAvatarUrl && profileData && profileData.avatar_url !== googleAvatarUrl) {
            await supabase
              .from("profiles")
              .update({ avatar_url: googleAvatarUrl })
              .eq("id", session.user.id);

            setProfile({ ...profileData, avatar_url: googleAvatarUrl });
          } else {
            setProfile(profileData);
          }
        };

        fetchProfile();
      } else {
        setProfile(null);
      }
    }
  );

  // THEN check for existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
      setLoading(false);
    }
  });

  return () => subscription.unsubscribe();
}, []);

const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Email é obrigatório");
    }

    const redirectUrl = `${window.location.origin}/`;  // ⚠️ CRITICAL: Email redirect

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,  // ⚠️ MUST include this
        data: {
          full_name: fullName,  // Stored in raw_user_meta_data
        },
      },
    });

    if (error) {
      // Handle specific errors
      if (error.message.includes("already registered")) {
        toast.error("Email já cadastrado");
      } else {
        toast.error(error.message);
      }
      throw error;
    }

    toast.success("Verifique seu email para confirmar o cadastro");
  } catch (error: any) {
    console.error("Signup error:", error);
    throw error;
  }
};

const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Store rememberMe preference
    if (rememberMe) {
      localStorage.setItem('auth-remember-me', 'true');
    } else {
      localStorage.removeItem('auth-remember-me');
      sessionStorage.setItem('auth-session-only', 'true');  // Session-only
    }

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        throw new Error("Email not confirmed");
      }
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error(error.message);
      }
      throw error;
    }

    toast.success("Login realizado com sucesso!");
    navigate("/navegador");
  } catch (error: any) {
    console.error("Login error:", error);
    throw error;
  }
};

const signInWithGoogle = async () => {
  try {
    // Call edge function to get Google OAuth URL
    const { data, error } = await supabase.functions.invoke('google-oauth-initiate');

    if (error) {
      console.error('Error getting Google auth URL:', error);
      toast.error('Erro ao iniciar login com Google');
      throw error;
    }

    if (!data?.authUrl) {
      throw new Error('No auth URL returned from server');
    }

    // Store state for CSRF protection
    if (data.state) {
      sessionStorage.setItem('oauth_state', data.state);
    }

    console.log('Redirecting to Google OAuth...');

    // Redirect to Google
    window.location.href = data.authUrl;
  } catch (error: any) {
    console.error('Google sign in error:', error);
    toast.error(error.message || 'Erro ao fazer login com Google');
    throw error;
  }
};

const signOut = async () => {
  try {
    // Sign out from Supabase (invalidates server-side session)
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      throw error;
    }

    // Clear local state
    setUser(null);
    setSession(null);
    setProfile(null);

    // Clear local storage
    localStorage.removeItem('auth-remember-me');
    sessionStorage.removeItem('auth-session-only');

    toast.success("Logout realizado");
    navigate("/");  // Redirect to landing
  } catch (error: any) {
    console.error("Signout error:", error);
    throw error;
  }
};

  const resetPassword = async (email: string) => {
  try {
    const redirectUrl = `${window.location.origin}/reset-password`;  // ⚠️ CRITICAL

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success("Email de recuperação enviado!");
  } catch (error: any) {
    console.error("Reset password error:", error);
    throw error;
  }
};

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      // Fetch updated profile
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setProfile(profileData);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
      throw error;
    }
  };

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
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
