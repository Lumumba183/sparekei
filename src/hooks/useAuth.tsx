import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
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
  const { signOut, session } = useClerk();
  const [user, setUser] = useState<User | null>(null);

  // Bridge Clerk identity -> app User; provision row in Supabase app_users.
  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) { setUser(null); return; }

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? '';
    const metaRole = clerkUser.publicMetadata?.role as UserRole | undefined;
    const role: UserRole =
      email.toLowerCase() === ADMIN_EMAIL ? 'admin' : (metaRole ?? 'owner');

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
    setUser(appUser);

    // Fire-and-forget provisioning into Supabase (RLS self-upsert policy).
    (async () => {
      try {
        const token = await session?.getToken();
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
        /* non-fatal: app runs off Clerk identity even if Supabase is unreachable */
      }
    })();
  }, [clerkUser, isLoaded, session]);

  // Real auth happens in Clerk's <SignIn>/<SignUp> on /login and /register.
  const login = useCallback(async (_email: string, _password: string) => {}, []);
  const register = useCallback(async (_email: string, _password: string, _fullName: string, _role: UserRole) => {}, []);

  const logout = useCallback(() => { signOut(); }, [signOut]);

  const switchRole = useCallback((role: UserRole) => {
    setUser(prev => prev ? { ...prev, role } : null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading: !isLoaded,
      login,
      register,
      logout,
      switchRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
