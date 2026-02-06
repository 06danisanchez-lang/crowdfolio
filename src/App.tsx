import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import { useEffect, useRef, useState } from "react";
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
    console.log(`[Router] ${message}`, data ?? '');
  }
};

// Redirect loop detection constants - reduced threshold for faster detection
const REDIRECT_LOOP_THRESHOLD = 4;
const REDIRECT_LOOP_WINDOW_MS = 2000;

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
  
  return state.count >= REDIRECT_LOOP_THRESHOLD;
}

function clearRedirectCount() {
  try {
    sessionStorage.removeItem('auth_redirect_state');
  } catch {
    // Ignore storage errors
  }
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
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

// AuthGate: Blocks ALL rendering until auth is fully bootstrapped
function AuthGate({ children }: { children: React.ReactNode }) {
  const { hasBootstrapped, isLoading } = useAuth();
  
  debugLog('AuthGate check', { hasBootstrapped, isLoading });
  
  if (!hasBootstrapped || isLoading) {
    debugLog('AuthGate: blocking render, showing spinner');
    return <LoadingSpinner />;
  }
  
  debugLog('AuthGate: bootstrap complete, rendering children');
  return <>{children}</>;
}

// Simplified ProtectedRoute - only runs after AuthGate confirms bootstrap
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, hasBootstrapped, isLoading } = useAuth();
  const [canRedirect, setCanRedirect] = useState(false);
  const hasCheckedLoopRef = useRef(false);

  // Small delay to ensure state is fully stabilized
  useEffect(() => {
    if (hasBootstrapped && !isLoading) {
      const timer = setTimeout(() => {
        debugLog('ProtectedRoute: stabilization complete');
        setCanRedirect(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [hasBootstrapped, isLoading]);

  // Reset redirect tracking when user is authenticated
  useEffect(() => {
    if (user && canRedirect) {
      clearRedirectCount();
    }
  }, [user, canRedirect]);

  // Still waiting for stabilization
  if (!canRedirect) {
    debugLog('ProtectedRoute: waiting for stabilization');
    return <LoadingSpinner />;
  }

  // No user - need to redirect
  if (!user) {
    debugLog('ProtectedRoute: no user, checking for loop');
    
    if (!hasCheckedLoopRef.current) {
      hasCheckedLoopRef.current = true;
      const isLoop = incrementRedirectCount();
      
      if (isLoop) {
        debugLog('ProtectedRoute: REDIRECT LOOP DETECTED');
        return <RedirectLoopFallback />;
      }
    }
    
    debugLog('ProtectedRoute: redirecting to /landing');
    return <Navigate to="/landing" replace />;
  }

  debugLog('ProtectedRoute: user authenticated, rendering');
  return <>{children}</>;
}

// Simplified PublicRoute - only runs after AuthGate confirms bootstrap
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, hasBootstrapped, isLoading } = useAuth();
  const [canRedirect, setCanRedirect] = useState(false);
  const hasCheckedLoopRef = useRef(false);

  // Small delay to ensure state is fully stabilized
  useEffect(() => {
    if (hasBootstrapped && !isLoading) {
      const timer = setTimeout(() => {
        debugLog('PublicRoute: stabilization complete');
        setCanRedirect(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [hasBootstrapped, isLoading]);

  // Reset redirect tracking when no user
  useEffect(() => {
    if (!user && canRedirect) {
      clearRedirectCount();
    }
  }, [user, canRedirect]);

  // Still waiting for stabilization
  if (!canRedirect) {
    debugLog('PublicRoute: waiting for stabilization');
    return <LoadingSpinner />;
  }

  // User exists - need to redirect to protected area
  if (user) {
    debugLog('PublicRoute: user exists, checking for loop');
    
    if (!hasCheckedLoopRef.current) {
      hasCheckedLoopRef.current = true;
      const isLoop = incrementRedirectCount();
      
      if (isLoop) {
        debugLog('PublicRoute: REDIRECT LOOP DETECTED');
        return <RedirectLoopFallback />;
      }
    }
    
    debugLog('PublicRoute: redirecting to /');
    return <Navigate to="/" replace />;
  }

  debugLog('PublicRoute: no user, rendering public content');
  return <>{children}</>;
}

const AppRoutes = () => (
  <AuthGate>
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
      <Route 
        path="/admin-dashboard" 
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="/pricing" element={<Pricing onBack={() => window.history.back()} />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthGate>
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
