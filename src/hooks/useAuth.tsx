'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  userId: string;
  email: string;
  roles: string[];
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/profile');
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setError(null);
      } else if (response.status === 401) {
        setUser(null);
        setError('Not authenticated');
      } else {
        throw new Error('Failed to check authentication');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Authentication check failed');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user?.roles) return false;
    return roles.some(role => user.roles.includes(role));
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
  };
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  fallback = null,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasAnyRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
        // Redirect based on user role
        if (user?.roles?.includes('SuperAdmin')) {
          router.push('/dashboard');
        } else if (user?.roles?.includes('Admin')) {
          router.push('/dashboard');
        } else {
          router.push('/dashboard');
        }
        return;
      }
    }
  }, [loading, isAuthenticated, hasAnyRole, requiredRoles, router, redirectTo, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback;
  }

  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher Order Component for page-level protection
export function withAuth<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  requiredRoles?: string[]
) {
  return function AuthenticatedComponent(props: T) {
    return (
      <ProtectedRoute requiredRoles={requiredRoles}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}