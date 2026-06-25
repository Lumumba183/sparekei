import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { currentUser } from '@/data/mockData';

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
  const [user, setUser] = useState<User | null>(currentUser);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const mockUser: User = {
      id: 'usr-' + Date.now(),
      email,
      fullName: email.split('@')[0],
      role: 'owner',
      avatar: `https://i.pravatar.cc/150?u=${email}`,
      city: 'Nairobi',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
    };
    setUser(mockUser);
    setIsLoading(false);
  }, []);

  const register = useCallback(async (email: string, _password: string, fullName: string, role: UserRole) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const mockUser: User = {
      id: 'usr-' + Date.now(),
      email,
      fullName,
      role,
      avatar: `https://i.pravatar.cc/150?u=${email}`,
      city: 'Nairobi',
      subscriptionPlan: 'basic',
      subscriptionStatus: 'trial',
    };
    setUser(mockUser);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setUser(prev => prev ? { ...prev, role } : null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
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
