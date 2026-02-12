import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';

const AUTH_TIMEOUT_MS = 10_000;

// Debug flag - enable with ?debugAuth=1 in URL
const isDebugAuth = () => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('debugAuth');
};

const debugLog = (message: string, data?: unknown) => {
  if (isDebugAuth()) {
    console.log(`[Auth] ${message}`, data ?? '');
  }
};

function getAuthOrigin(): string {
  const { hostname, origin } = window.location;
  if (hostname === 'crowdfolio.es' || hostname === 'www.crowdfolio.es') {
    return 'https://crowdfolio.es';
  }
  return origin;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  hasBootstrapped: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  
  const hasBootstrappedRef = useRef(false);
  const webhookFiredForRef = useRef<Set<string>>(new Set());

  const fireNewUserWebhook = useCallback((user: User) => {
    if (webhookFiredForRef.current.has(user.id)) return;
    const createdAt = new Date(user.created_at).getTime();
    const ageMs = Date.now() - createdAt;
    if (ageMs > 30_000) return;
    webhookFiredForRef.current.add(user.id);
    fetch('https://brunosanchez.app.n8n.cloud/webhook/nuevo-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        fecha: new Date().toISOString(),
        origen: 'crowdfolio_google',
      }),
    }).catch(() => {});
  }, []);

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      debugLog('Checking admin role for user', userId);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        return;
      }
      const isAdminResult = !!data;
      debugLog('Admin role result', isAdminResult);
      setIsAdmin(isAdminResult);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    debugLog('Setting up auth listener and initializing');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession) => {
        if (!isMounted) return;
        debugLog('onAuthStateChange event', { event, hasSession: !!newSession, hasBootstrapped: hasBootstrappedRef.current });

        if (event === 'INITIAL_SESSION') {
          debugLog('Ignoring INITIAL_SESSION event - handled by getSession()');
          return;
        }

        debugLog('Processing auth event', { event, userId: newSession?.user?.id });
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          fireNewUserWebhook(newSession.user);
        }

        if (newSession?.user) {
          checkAdminRole(newSession.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // CARGA INICIAL con timeout de 10s
    const initializeAuth = async () => {
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('[Auth] Bootstrap timeout after 10s - falling back to unauthenticated');
          if (isMounted) {
            setUser(null);
            setSession(null);
            setIsAdmin(false);
            hasBootstrappedRef.current = true;
            setHasBootstrapped(true);
            setIsLoading(false);
          }
        }
      }, AUTH_TIMEOUT_MS);

      try {
        debugLog('Starting initializeAuth');
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);
        if (resolved) return; // timeout already fired, ignore late response
        resolved = true;

        if (error) {
          console.error('Error getting session:', error);
        }
        if (!isMounted) return;

        debugLog('getSession result', { hasSession: !!initialSession, userId: initialSession?.user?.id });
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          checkAdminRole(initialSession.user.id);
        } else {
          setIsAdmin(false);
        }

        hasBootstrappedRef.current = true;
        setHasBootstrapped(true);
        debugLog('Bootstrap complete, setting isLoading to false');
      } catch (error) {
        clearTimeout(timeoutId);
        if (resolved) return;
        resolved = true;

        console.error('Error in initializeAuth:', error);
      } finally {
        if (isMounted && resolved) {
          hasBootstrappedRef.current = true;
          setHasBootstrapped(true);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${getAuthOrigin()}/`;
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    const redirectUri = getAuthOrigin();
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
    if (result.redirected) return { error: null };
    if (result.error) {
      const enhancedError = new Error(`${result.error.message} (redirect_uri usado: ${redirectUri})`);
      return { error: enhancedError };
    }
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${getAuthOrigin()}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, isLoading, isAdmin, hasBootstrapped,
      signIn, signUp, signInWithGoogle, signOut, resetPassword, updatePassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
