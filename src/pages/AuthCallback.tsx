import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAppConfig } from "@/lib/appConfig";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');
        const type = params.get('type');
        const tokenHash = params.get('token_hash');
        const token = params.get('token');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const redirectTo = params.get('redirect_to');

        if (errorParam) {
          const errorMessage = errorParam === 'access_denied'
            ? 'Acesso negado'
            : 'Erro ao fazer login com Google';
          setError(errorMessage);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // Supabase email link flows (signup/recovery/email_change)
        // If Supabase did not embed tokens in URL, attempt to exchange token_hash for a session
        if ((tokenHash || token) && type) {
          const otpToken = tokenHash || token;
          const verifyType = type === 'recovery' ? 'recovery' : type === 'email_change' ? 'email_change' : 'signup';
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            type: verifyType as any,
            token_hash: otpToken!,
          });

          if (verifyError) {
            setError(verifyError.message || 'Falha ao validar link');
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }

          if (verifyType === 'recovery') {
            toast.success('Sessão restaurada, defina sua nova senha');
            // If Supabase sent access/refresh tokens, set session to allow password change
            const acc = accessToken || params.get('access_token') || (verifyData as any)?.session?.access_token;
            const ref = refreshToken || params.get('refresh_token') || (verifyData as any)?.session?.refresh_token;
            if (acc && ref) {
              await supabase.auth.setSession({ access_token: acc, refresh_token: ref }).catch(() => {});
            }
            const target = redirectTo || '/reset-password';
            const url = new URL(target, window.location.origin);
            if (acc && ref) {
              url.searchParams.set('access_token', acc);
              url.searchParams.set('refresh_token', ref);
            }
            navigate(url.pathname + url.search);
            return;
          }

          toast.success('Email confirmado com sucesso');
          navigate('/dashboard');
          return;
        }

        // Email change flow: old email authorization
        if (type === 'email_change_auth' && token) {
          const config = getAppConfig();
          const { error: fnError } = await supabase.functions.invoke('email-change-verify', {
            body: { tokenId: token, ...config },
          });

          if (fnError) {
            setError(fnError.message || 'Erro ao enviar verificação do novo email');
            setTimeout(() => navigate('/profile'), 3000);
            return;
          }

          toast.success('Autorização recebida. Verifique o novo email para confirmar.');
          navigate('/profile');
          return;
        }

        // Email change flow: new email confirmation
        if (type === 'email_change_verify' && token) {
          const { error: fnError } = await supabase.functions.invoke('email-change-complete', {
            body: { tokenId: token },
          });

          if (fnError) {
            setError(fnError.message || 'Erro ao concluir alteração de email');
            setTimeout(() => navigate('/profile'), 3000);
            return;
          }

          toast.success('Email alterado com sucesso. Faça login novamente.');
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }

        // Google OAuth flow
        if (!code) {
          setError('Código de autorização não recebido');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        const storedState = sessionStorage.getItem('oauth_state');
        if (storedState && state !== storedState) {
          setError('Estado de segurança inválido');
          sessionStorage.removeItem('oauth_state');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
        sessionStorage.removeItem('oauth_state');

        const { appUrl, language } = getAppConfig();
        const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke(
          'google-oauth-callback',
          { body: { code, state, appUrl, language } }
        );

        if (exchangeError || !exchangeData?.access_token || !exchangeData?.refresh_token) {
          setError('Falha ao trocar código por sessão');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: exchangeData.access_token,
          refresh_token: exchangeData.refresh_token,
        });

        if (sessionError) {
          setError('Erro ao configurar sessão');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        toast.success('Login realizado com sucesso!');
        window.history.replaceState({}, '', '/auth/callback');
        navigate('/dashboard');

      } catch (error: any) {
        console.error('Error in auth callback:', error);
        setError(error.message || 'Erro desconhecido');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

 if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-pulse text-destructive text-xl">
            Erro ao processar login
          </div>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Redirecionando para a página de login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Processando login...</p>
      </div>
    </div>
  );
}
