import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, LogOut, Home, RefreshCw, LogIn } from "lucide-react";

const queryClient = new QueryClient();

// Debug flag - enable with ?debugAuth=1 in URL
const isDebugAuth = () => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('debugAuth');
};

const debugLog = (message: string, data?: unknown) => {
  if (isDebugAuth()) {
    console.debug(`[Router] ${message}`, data ?? '');
  }
};

// Redirect loop detection constants
const REDIRECT_LOOP_THRESHOLD = 6; // Max redirects before triggering fallback
const REDIRECT_LOOP_WINDOW_MS = 3000; // Time window to count redirects

interface RedirectState {
  count: number;
  lastRedirectAt: number;
}

function getRedirectState(): RedirectState {
  try {
    const stored = sessionStorage.getItem('auth_redirect_state');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { count: 0, lastRedirectAt: 0 };
}

function incrementRedirectCount(): boolean {
  const now = Date.now();
  const state = getRedirectState();
  
  // Reset count if outside the time window
  if (now - state.lastRedirectAt > REDIRECT_LOOP_WINDOW_MS) {
    state.count = 1;
  } else {
    state.count++;
  }
  state.lastRedirectAt = now;
  
  try {
    sessionStorage.setItem('auth_redirect_state', JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
  
  debugLog('Redirect count updated', state);
  
  // Return true if we've exceeded the threshold (loop detected)
  return state.count >= REDIRECT_LOOP_THRESHOLD;
}

function clearRedirectCount() {
  try {
    sessionStorage.removeItem('auth_redirect_state');
  } catch {
    // Ignore storage errors
  }
}

// Fallback UI for redirect loop detection
function RedirectLoopFallback() {
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    clearRedirectCount();
    await signOut();
    window.location.href = '/landing';
  };
  
  const handleGoToLanding = () => {
    clearRedirectCount();
    window.location.href = '/landing';
  };
  
  const handleGoToAuth = () => {
    clearRedirectCount();
    window.location.href = '/auth';
  };
  
  const handleReload = () => {
    clearRedirectCount();
    window.location.reload();
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Bucle de redirección detectado</CardTitle>
          <CardDescription>
            Se ha detectado un problema con el estado de tu sesión que está causando redirecciones continuas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="default" 
            className="w-full" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión e ir a Landing
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoToAuth}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Ir a Iniciar sesión
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoToLanding}
          >
            <Home className="mr-2 h-4 w-4" />
            Ir a Landing
          </Button>
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={handleReload}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar página
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, hasBootstrapped } = useAuth();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);

  // Reset redirect tracking when component mounts with a valid user
  useEffect(() => {
    if (user && hasBootstrapped) {
      clearRedirectCount();
      hasRedirectedRef.current = false;
    }
  }, [user, hasBootstrapped]);

  if (isLoading) {
    debugLog('ProtectedRoute: isLoading=true, showing spinner');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Wait for bootstrap to complete before making redirect decisions
  if (!hasBootstrapped) {
    debugLog('ProtectedRoute: waiting for bootstrap');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    debugLog('ProtectedRoute: no user, checking for redirect loop', { path: location.pathname });
    
    // Check for redirect loop before redirecting
    if (!hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const isLoop = incrementRedirectCount();
      
      if (isLoop) {
        debugLog('ProtectedRoute: REDIRECT LOOP DETECTED, showing fallback');
        return <RedirectLoopFallback />;
      }
    }
    
    debugLog('ProtectedRoute: redirecting to /landing');
    return <Navigate to="/landing" replace />;
  }

  debugLog('ProtectedRoute: user authenticated, rendering children');
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, hasBootstrapped } = useAuth();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);

  // Reset redirect tracking when component mounts without a user
  useEffect(() => {
    if (!user && hasBootstrapped) {
      clearRedirectCount();
      hasRedirectedRef.current = false;
    }
  }, [user, hasBootstrapped]);

  if (isLoading) {
    debugLog('PublicRoute: isLoading=true, showing spinner');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Wait for bootstrap to complete before making redirect decisions
  if (!hasBootstrapped) {
    debugLog('PublicRoute: waiting for bootstrap');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    debugLog('PublicRoute: user exists, checking for redirect loop', { path: location.pathname });
    
    // Check for redirect loop before redirecting
    if (!hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const isLoop = incrementRedirectCount();
      
      if (isLoop) {
        debugLog('PublicRoute: REDIRECT LOOP DETECTED, showing fallback');
        return <RedirectLoopFallback />;
      }
    }
    
    debugLog('PublicRoute: redirecting to /');
    return <Navigate to="/" replace />;
  }

  debugLog('PublicRoute: no user, rendering children');
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route 
      path="/" 
      element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/landing" 
      element={
        <PublicRoute>
          <Landing />
        </PublicRoute>
      } 
    />
    <Route 
      path="/auth" 
      element={
        <PublicRoute>
          <Auth />
        </PublicRoute>
      } 
    />
    <Route path="/pricing" element={<Pricing onBack={() => window.history.back()} />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <AppRoutes />
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
