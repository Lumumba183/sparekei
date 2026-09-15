import { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useUser, useSession, useClerk } from '@clerk/clerk-react';
import type { User, UserRole } from '@/types';
import { getSupabase } from '@/lib/supabase';
import { ADMIN_EMAIL } from '@/lib/env';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const [user, setUser] = useState<User | null>(null);

  // Refs keep latest values available inside effects WITHOUT being effect dependencies
  // (unstable object identities here caused a render-loop flicker in production).
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const provisionedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      setUser(null);
      provisionedFor.current = null;
      return;
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? '';
    const metaRole = clerkUser.publicMetadata?.role as UserRole | undefined;
    const role: UserRole =
      email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : (metaRole ?? 'owner');

    const appUser: User = {
      id: clerkUser.id,
      email,
      fullName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0],
      role,
      avatar: clerkUser.imageUrl || `https://i.pravatar.cc/150?u=${email}`,
      city: 'Nairobi',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
    };

    // Preserve object identity when nothing changed -> no context churn -> no flicker
    setUser(prev => (prev && prev.id === appUser.id && prev.role === appUser.role ? prev : appUser));

    // Provision into Supabase app_users exactly once per user
    if (provisionedFor.current !== clerkUser.id) {
      provisionedFor.current = clerkUser.id;
      (async () => {
        try {
          const token = await sessionRef.current?.getToken({ template: 'supabase' });
          if (!token) return; // no Clerk session -> skip (avoids anon-key RLS 401 noise)
          const supabase = getSupabase(token);
          await supabase.from('app_users').upsert(
            {
              clerk_user_id: clerkUser.id,
              email: email.toLowerCase(),
              full_name: appUser.fullName,
              role,
            },
            { onConflict: 'email' }
          );
        } catch {
          /* non-fatal: app runs off Clerk identity */
        }
      })();
    }
  }, [clerkUser, isLoaded]);

  // Real auth happens in Clerk's <SignIn>/<SignUp> on /login and /register.
  const login = useCallback(async (_email: string, _password: string) => {}, []);
  const register = useCallback(async (_email: string, _password: string, _fullName: string, _role: UserRole) => {}, []);

  const logout = useCallback(() => { signOut(); }, [signOut]);

  const switchRole = useCallback((role: UserRole) => {
    setUser(prev => (prev ? { ...prev, role } : null));
  }, []);

  // While Clerk HAS a signed-in user but the bridge effect hasn't populated
  // the context user yet, we are still "loading". Without this, route guards
  // saw isAuthenticated=false on the first render of every page load/refresh
  // and bounced to /login, which bounced straight back -> visible flicker.
  const bridging = !!clerkUser && user === null;

  // Memoized value: Clerk updates its hooks periodically (session touches,
  // token refresh). A fresh object identity every render used to re-render
  // every consumer app-wide for no reason.
  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading: !isLoaded || bridging,
    login,
    register,
    logout,
    switchRole,
  }), [user, isLoaded, bridging, login, register, logout, switchRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
