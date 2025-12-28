import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAppConfig, getNormalizedLanguage } from "@/lib/appConfig";

interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  preferred_language?: string;
  display_mode?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string, fullName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        const fetchProfile = async () => {
          try {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            const googleAvatarUrl = session.user.user_metadata?.avatar_url;
            if (googleAvatarUrl && profileData && profileData.avatar_url !== googleAvatarUrl) {
              await supabase.from("profiles").update({ avatar_url: googleAvatarUrl }).eq("id", session.user.id);
              setProfile({ ...profileData, avatar_url: googleAvatarUrl });
            } else {
              setProfile(profileData);
            }
          } catch (err) {
            console.error("Profile fetch error:", err);
            setProfile(null);
          }
        };

        fetchProfile();
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          const customError = new Error("Email não confirmado");
          (customError as any).code = "email_not_confirmed";
          (customError as any).email = normalizedEmail;
          throw customError;
        }
        throw error;
      }

      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      if (error.code === "email_not_confirmed") {
        throw error;
      }
      toast.error(error.message || "Erro ao fazer login");
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const config = getAppConfig();

    try {
      const { error } = await supabase.functions.invoke("email-validation", {
        body: {
          email: normalizedEmail,
          password,
          fullName,
          isResend: false,
          ...config,
        },
      });

      if (error) throw error;

      toast.success("Verifique seu email para confirmar o cadastro");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { appUrl, language } = getAppConfig();
      const { data, error } = await supabase.functions.invoke("google-oauth-initiate", {
        body: {
          appUrl,
          language,
        },
      });

      if (error) throw error;

      if (!data?.authUrl || !data?.state) {
        throw new Error("Resposta inválida do servidor de OAuth");
      }

      sessionStorage.setItem("oauth_state", data.state);
      sessionStorage.setItem("oauth_language", language);

      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error("Google sign in error:", error);
      toast.error(error.message || "Erro ao fazer login com Google");
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error && error.message !== "Session not found") {
        throw error;
      }
    } catch (error: any) {
      console.error("Logout error:", error);
    } finally {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      setSession(null);
      setUser(null);
      setProfile(null);
      navigate("/");
    }
  };

  const resendVerificationEmail = async (email: string, fullName?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const config = getAppConfig();
    try {
      const { error } = await supabase.functions.invoke("email-validation", {
        body: {
          email: normalizedEmail,
          fullName: fullName || normalizedEmail.split("@")[0],
          isResend: true,
          ...config,
        },
      });

      if (error) throw error;
      toast.success("Email de verificação reenviado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao reenviar verificação");
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const config = getAppConfig();
    try {
      const { error } = await supabase.functions.invoke("email-resetpwd", {
        body: {
          email: normalizedEmail,
          ...config,
        },
      });

      if (error) throw error;
      toast.success("Email de recuperação enviado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar recuperação");
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const now = new Date().toISOString();
      const upsertData = {
        id: user.id,
        full_name: updates.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        ...updates,
        updated_at: now,
        created_at: now,
      };

      const { error } = await supabase.from("profiles").upsert(upsertData, { onConflict: "id" });
      if (error) throw error;

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
    session,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resendVerificationEmail,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
