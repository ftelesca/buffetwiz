export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');

        // 2. Handle Google errors
        if (errorParam) {
          const errorMessage = errorParam === 'access_denied' 
            ? 'Acesso negado' 
            : 'Erro ao fazer login com Google';
          setError(errorMessage);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // 3. Validate authorization code
        if (!code) {
          setError('Código de autorização não recebido');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // 4. CSRF protection: Validate state
        const storedState = sessionStorage.getItem('oauth_state');
        if (storedState && state !== storedState) {
          setError('Estado de segurança inválido');
          sessionStorage.removeItem('oauth_state');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
        sessionStorage.removeItem('oauth_state');

        // 5. Exchange code for tokens via edge function
        const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke(
          'google-oauth-callback',
          { body: { code, state } }
        );

        if (exchangeError || !exchangeData?.access_token || !exchangeData?.refresh_token) {
          setError('Falha ao trocar código por sessão');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // 6. Set Supabase session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: exchangeData.access_token,
          refresh_token: exchangeData.refresh_token,
        });

        if (sessionError) {
          setError('Erro ao configurar sessão');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // 7. Success!
        toast.success('Login realizado com sucesso!');
        window.history.replaceState({}, '', '/auth/callback');
        navigate('/navegador');

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

