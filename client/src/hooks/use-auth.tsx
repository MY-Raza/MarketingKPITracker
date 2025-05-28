import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { apiClient } from "../services/api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = "marketing_kpi_tokens";
const USER_STORAGE_KEY = "marketing_kpi_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        if (storedTokens && storedUser) {
          const tokens = JSON.parse(storedTokens);
          const userData = JSON.parse(storedUser);

          // Set tokens in API client
          apiClient.setTokens(tokens);
          setUser(userData);

          // Verify the token is still valid by getting user profile
          try {
            const currentUser = await apiClient.get('/api/auth/me');
            setUser(currentUser);
          } catch (error) {
            // Token is invalid, clear storage
            clearAuthData();
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Setup token refresh interval
  useEffect(() => {
    if (user && isAuthenticated) {
      const interval = setInterval(() => {
        refreshTokenSilently();
      }, 14 * 60 * 1000); // Refresh every 14 minutes (tokens expire in 15 minutes)

      return () => clearInterval(interval);
    }
  }, [user]);

  const clearAuthData = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    apiClient.clearTokens();
    setUser(null);
  };

  const saveAuthData = (user: User, tokens: AuthTokens) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    apiClient.setTokens(tokens);
    setUser(user);
  };

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      const { user, tokens } = response;
      saveAuthData(user, tokens);
      setLocation('/dashboard');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/auth/register', data);

      const { user, tokens } = response;
      saveAuthData(user, tokens);
      setLocation('/dashboard');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        await apiClient.post('/api/auth/logout', {
          refreshToken: tokens.refreshToken,
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      clearAuthData();
      setLocation('/login');
    }
  };

  const refreshTokenSilently = async (): Promise<void> => {
    try {
      const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedTokens) return;

      const tokens = JSON.parse(storedTokens);
      const response = await apiClient.post('/api/auth/refresh', {
        refreshToken: tokens.refreshToken,
      });

      const newTokens = response;
      const updatedTokens = {
        ...tokens,
        ...newTokens,
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(updatedTokens));
      apiClient.setTokens(updatedTokens);
    } catch (error) {
      console.error('Error refreshing token:', error);
      // If refresh fails, logout the user
      await logout();
    }
  };

  const refreshToken = async (): Promise<void> => {
    await refreshTokenSilently();
  };

  const isAuthenticated = !!user;

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        setLocation('/login');
      }
    }, [isAuthenticated, isLoading, setLocation]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

// Hook for admin-only access
export function useRequireAdmin() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'ADMIN') {
      setLocation('/dashboard');
    }
  }, [user, isAuthenticated, setLocation]);

  return user?.role === 'ADMIN';
}
