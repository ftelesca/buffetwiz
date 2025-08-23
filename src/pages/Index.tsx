import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { MainLayout } from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/useAuth"
import Dashboard from "./Dashboard"
import { Skeleton } from "@/components/ui/skeleton"

const Index = () => {
  console.log('Index component rendering');
  
  let user, loading, navigate;
  
  try {
    const authContext = useAuth();
    user = authContext.user;
    loading = authContext.loading;
    navigate = useNavigate();
    console.log('Auth context available:', { user: !!user, loading });
  } catch (error) {
    console.error('Auth context error:', error);
    // If auth context is not available, redirect to auth page
    navigate = useNavigate();
    useEffect(() => {
      navigate("/auth");
    }, [navigate]);
    return <div>Redirecting to authentication...</div>;
  }

  useEffect(() => {
    console.log('Index useEffect:', { loading, user: !!user });
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    console.log('Index showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('Index: no user, returning null');
    return null;
  }

  console.log('Index rendering MainLayout');
  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
};

export default Index;
