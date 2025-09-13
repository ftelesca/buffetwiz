import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResetPasswordPage } from "@/components/auth/ResetPasswordPage";
import { handleExportClick } from "@/lib/export-handler";
// Regular imports for immediate loading
import Index from "./pages/Index";
import Events from "./pages/Events";
import Customers from "./pages/Customers";
import Recipes from "./pages/Recipes";
import Supplies from "./pages/Supplies";
import NotFound from "./pages/NotFound";
import React from "react";

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


const App = () => {
  // Global click handler for export links
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if it's an anchor tag with export: href
      if (target.tagName === 'A') {
        const href = (target as HTMLAnchorElement).href;
        if (href && href.includes('export:')) {
          event.preventDefault();
          event.stopPropagation();
          
          const payload = href.split('export:')[1];
          if (payload) {
            console.log('🔗 Intercepted export link click:', { href, payload });
            handleExportClick(decodeURIComponent(payload));
          }
          return false;
        }
      }
      
      // Check if it's a button with export functionality
      if (target.tagName === 'BUTTON' && target.dataset?.exportPayload) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('🔗 Intercepted export button click:', target.dataset.exportPayload);
        handleExportClick(target.dataset.exportPayload);
        return false;
      }
    };

    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
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
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
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
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
