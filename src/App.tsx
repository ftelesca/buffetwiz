import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResetPasswordPage } from "@/components/auth/ResetPasswordPage";

// Regular imports for immediate loading
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Customers from "./pages/Customers";
import Recipes from "./pages/Recipes";
import Supplies from "./pages/Supplies";
import NotFound from "./pages/NotFound";
import React, { useEffect } from "react";
import { handleExportClick } from "@/lib/export-handler";

// Auth components
import LoginForm from "./components/auth/LoginForm";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 2,
    },
  },
});

const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Detect Supabase email link redirects and force password setup/reset flow
  const params = new URLSearchParams(location.search);
  const hasAccessToken = params.has("access_token");
  const linkType = params.get("type");
  const mustReset = hasAccessToken && (linkType === "signup" || linkType === "recovery" || linkType === "invite");

  if (mustReset) {
    return <Navigate to={`/reset-password${location.search}`} replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = (target && (target as any).closest) ? (target.closest('a') as HTMLAnchorElement | null) : null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      
      // BLOQUEIO: Prevenir chamadas ao endpoint antigo wizard-export-pdf
      if (href.includes('/functions/v1/wizard-export-pdf') || href.includes('wizard-export-pdf')) {
        e.preventDefault();
        e.stopPropagation();
        
        return;
      }

      // Case 1: explicit export: links
      if (href.startsWith('export:')) {
        e.preventDefault();
        e.stopPropagation();
        const payload = href.replace(/^export:/, '');
        handleExportClick(payload);
        return;
      }

      // Case 2: ChatGPT-like text links: "Baixar arquivo.ext" pointing to a page URL
      const text = (anchor.textContent || '').toLowerCase();
      const fileMatch = text.match(/\bbaixar\s+([\w\-\s]+\.(xlsx|csv|json))\b/i);
      if (fileMatch) {
        e.preventDefault();
        e.stopPropagation();
        const file = fileMatch[1];
        // Trigger fallback inference by passing only filename in a pseudo-payload
        handleExportClick(`filename:"${file}"`);
        return;
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public auth routes - redirect to app if already logged in */}
                <Route 
                  path="/" 
                  element={
                    <AuthenticatedRoute>
                      <LoginForm />
                    </AuthenticatedRoute>
                  } 
                />
                <Route 
                  path="/auth" 
                  element={
                    <AuthenticatedRoute>
                      <LoginForm />
                    </AuthenticatedRoute>
                  } 
                />
                
                {/* Password reset - accessible to all */}
                <Route 
                  path="/reset-password" 
                  element={<ResetPasswordPage />} 
                />
                
                {/* OAuth callback routes */}
                <Route 
                  path="/auth/callback" 
                  element={
                    /* <AuthCallback /> - You need to create this page */
                    <div>Auth Callback - Create at src/pages/AuthCallback.tsx</div>
                  } 
                />
                <Route 
                  path="/auth/google/callback" 
                  element={
                    /* <AuthCallback /> - Same component handles Google callback */
                    <div>Auth Callback - Create at src/pages/AuthCallback.tsx</div>
                  } 
                />

                {/* Protected routes - require authentication */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/eventos" element={
                  <ProtectedRoute>
                    <Events />
                  </ProtectedRoute>
                } />
                <Route path="/clientes" element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                } />
                <Route path="/cardapios" element={
                  <ProtectedRoute>
                    <Recipes />
                  </ProtectedRoute>
                } />
                <Route path="/insumos" element={
                  <ProtectedRoute>
                    <Supplies />
                  </ProtectedRoute>
                } />
                
                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;